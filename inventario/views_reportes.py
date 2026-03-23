from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, generics
from django.core.files.base import ContentFile
from .models import Mercancia, Despacho, HistorialMovimientos, ReporteGenerado
from .serializers import ReporteGeneradoSerializer
from inventario.views import get_empresa_from_user
import io
import xlsxwriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from datetime import datetime
from usuarios.permissions import IsAdminEmpresa, IsJefeDeBodega, IsOperario

class ReportesRecientesAPI(generics.ListAPIView):
    serializer_class = ReporteGeneradoSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return ReporteGenerado.objects.filter(empresa=empresa).order_by('-fecha_generacion')[:10]

class GenerarReporteAPI(APIView):
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def post(self, request):
        empresa = get_empresa_from_user(request)
        tipo = request.data.get('tipo')
        formato = request.data.get('formato')
        fecha_inicio = request.data.get('fecha_inicio')
        fecha_fin = request.data.get('fecha_fin')

        data_list = []
        headers = []
        
        if tipo == 'Inventario':
            qs = Mercancia.activos.filter(empresa=empresa)
            if fecha_inicio: qs = qs.filter(fecha_ingreso__gte=fecha_inicio)
            if fecha_fin: qs = qs.filter(fecha_ingreso__lte=fecha_fin)
            
            headers = ['ID', 'Cliente', 'Descripción', 'Ubicación', 'Estado', 'Despacho', 'Ingreso', 'Bultos']
            
            for m in qs:
                ubicacion = m.id_ubicacion_actual.codigo_ubicacion if m.id_ubicacion_actual else "Sin Ubicación"
                despacho_info = str(m.id_despacho) if m.id_despacho else "Sin Asignar"
                
                data_list.append([
                    str(m.id_mercancia),
                    m.id_cliente.nombre_cliente,
                    m.descripcion_carga[:25] if m.descripcion_carga else "",
                    ubicacion,
                    m.estado,
                    despacho_info,
                    m.fecha_ingreso.strftime('%d/%m/%Y'),
                    str(m.cantidad_bultos)
                ])

        elif tipo == 'Despachos':
            qs = Despacho.objects.filter(empresa=empresa, activo=True)
            
            if fecha_inicio: 
                qs = qs.filter(fecha_programada__gte=fecha_inicio)
            if fecha_fin: 
                qs = qs.filter(fecha_programada__lte=fecha_fin)
            
            headers = ['ID', 'Fecha Prog.', 'Salida Real', 'Ruta', 'Camión', 'Estado']
            
            for d in qs:
                salida_real = d.fecha_salida_real.strftime('%d/%m/%y %H:%M') if d.fecha_salida_real else "Pendiente"
                
                data_list.append([
                    str(d.id_despacho),
                    d.fecha_programada.strftime('%d/%m/%Y'),
                    salida_real,
                    d.id_ruta.nombre_ruta[:20],
                    d.id_camion.patente,
                    d.estado_despacho
                ])
        
        elif tipo == 'Historial':
            qs = HistorialMovimientos.objects.filter(empresa=empresa).order_by('-fecha_hora_movimiento')

            if fecha_inicio: 
                qs = qs.filter(fecha_hora_movimiento__date__gte=fecha_inicio)
            if fecha_fin: 
                qs = qs.filter(fecha_hora_movimiento__date__lte=fecha_fin)
            
            headers = ['Fecha/Hora', 'Objeto / Lote', 'Usuario', 'Acción', 'Detalle']
            
            for h in qs:
                usuario = h.id_usuario.username if h.id_usuario else "Sistema"
                
                if h.id_mercancia:
                    objeto_str = f"Lote #{h.id_mercancia.id_mercancia}"
                elif h.modelo_afectado:
                    objeto_str = h.modelo_afectado
                else:
                    objeto_str = "-"

                accion_str = h.accion or h.tipo_movimiento or "Movimiento"

                data_list.append([
                    h.fecha_hora_movimiento.strftime('%d/%m/%y %H:%M'),
                    objeto_str, 
                    usuario,
                    accion_str,
                    h.descripcion_adicional[:50] or ""
                ])

        file_buffer = io.BytesIO()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M')
        filename = f"{tipo}_{timestamp}"

        if formato == 'PDF':
            filename += ".pdf"
            self.generar_pdf(file_buffer, empresa.nombre_empresa, tipo, headers, data_list)
            
        elif formato == 'Excel':
            filename += ".xlsx"
            self.generar_excel(file_buffer, empresa.nombre_empresa, tipo, headers, data_list)

        # 3. GUARDAR Y RESPONDER
        reporte = ReporteGenerado(
            empresa=empresa,
            usuario=request.user,
            tipo=tipo,
            formato=formato,
            parametros=f"{fecha_inicio} - {fecha_fin}" if fecha_inicio else "Histórico"
        )
        reporte.archivo.save(filename, ContentFile(file_buffer.getvalue()))
        reporte.save()

        return Response(ReporteGeneradoSerializer(reporte).data)

    # --- MÉTODOS AUXILIARES ---

    def generar_excel(self, buffer, empresa_nombre, tipo, headers, data):
        workbook = xlsxwriter.Workbook(buffer)
        worksheet = workbook.add_worksheet()

        title_format = workbook.add_format({'bold': True, 'font_size': 14, 'align': 'center', 'bg_color': '#DCE6F1'})
        header_format = workbook.add_format({'bold': True, 'bg_color': '#4F81BD', 'font_color': 'white', 'border': 1})
        cell_format = workbook.add_format({'border': 1})

        worksheet.merge_range(0, 0, 0, len(headers)-1, f"Reporte de {tipo} - {empresa_nombre}", title_format)
        worksheet.write(1, 0, f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_format)
            worksheet.set_column(col, col, 20) 

        row = 4
        for item in data:
            for col, value in enumerate(item):
                worksheet.write(row, col, value, cell_format)
            row += 1

        workbook.close()

    def generar_pdf(self, buffer, empresa_nombre, tipo, headers, data):
        p = canvas.Canvas(buffer, pagesize=landscape(letter))
        width, height = landscape(letter) 
        y = height - 50

        # Título
        p.setFont("Helvetica-Bold", 16)
        p.drawString(30, y, f"Reporte de {tipo}")
        p.setFont("Helvetica", 10)
        p.drawRightString(width - 30, y, f"{datetime.now().strftime('%d/%m/%Y %H:%M')}")
        y -= 20
        p.setFont("Helvetica", 12)
        p.drawString(30, y, f"Empresa: {empresa_nombre}")
        y -= 30

        # --- CONFIGURACIÓN DE ANCHOS DE COLUMNA ---
        if tipo == 'Inventario':
            col_widths = [
                30,  
                90,  
                120, 
                60,  
                70,  
                180, 
                70,  
                40   
            ]
        elif tipo == 'Despachos':
            col_widths = [40, 80, 100, 120, 80, 100]
        elif tipo == 'Historial':
            col_widths = [90, 60, 80, 120, 250]
        else:
            col_widths = [100] * len(headers)

        p.setFont("Helvetica-Bold", 9)
        x_start = 30
        current_x = x_start
        
        p.setFillColor(colors.lightgrey)
        p.rect(x_start, y - 2, sum(col_widths) + 10, 14, fill=1, stroke=0)
        p.setFillColor(colors.black)

        for i, header in enumerate(headers):
            p.drawString(current_x + 2, y + 2, header)
            current_x += col_widths[i] if i < len(col_widths) else 100
        
        y -= 20

        p.setFont("Helvetica", 8)
        for item in data:
            if y < 40: 
                p.showPage()
                y = height - 50
                p.setFont("Helvetica", 8)
            
            current_x = x_start
            for i, value in enumerate(item):
                text = str(value)
                
                max_chars = int(col_widths[i] / 5) 
                if len(text) > max_chars:
                    text = text[:max_chars-3] + "..."
                
                p.drawString(current_x + 2, y, text)
                current_x += col_widths[i]

            p.setStrokeColor(colors.lightgrey)
            p.line(x_start, y - 2, x_start + sum(col_widths), y - 2)
            p.setStrokeColor(colors.black)
            
            y -= 15

        p.save()