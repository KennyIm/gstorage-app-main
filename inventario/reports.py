from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from rest_framework.views import APIView
from rest_framework import permissions
from .models import Mercancia
from .views import get_empresa_from_user
import io

class ReporteInventarioPDF(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        empresa = get_empresa_from_user(request)
        mercancias = Mercancia.activos.filter(empresa=empresa)

        # Crear el buffer de memoria
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # --- HEADER ---
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, height - 50, f"Reporte de Inventario - {empresa.nombre_empresa}")
        
        p.setFont("Helvetica", 10)
        from datetime import datetime
        p.drawString(50, height - 70, f"Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')}")

        # --- TABLA 
        y = height - 110
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, y, "Lote #")
        p.drawString(100, y, "Cliente")
        p.drawString(250, y, "Ubicación")
        p.drawString(350, y, "Estado")
        p.drawString(450, y, "Ingreso")
        
        # Línea divisoria
        p.line(50, y - 5, 550, y - 5)
        y -= 20

        # --- DATOS ---
        p.setFont("Helvetica", 9)
        for m in mercancias:
            if y < 50: 
                p.showPage()
                y = height - 50
            
            p.drawString(50, y, str(m.id_mercancia))
            p.drawString(100, y, m.id_cliente.nombre_cliente[:25]) # Cortar nombre largo
            p.drawString(250, y, str(m.id_ubicacion_actual) if m.id_ubicacion_actual else "Sin Ubicación")
            p.drawString(350, y, m.estado)
            p.drawString(450, y, m.fecha_ingreso.strftime('%d/%m/%Y'))
            y -= 15

        p.showPage()
        p.save()

        buffer.seek(0)
        
        # Respuesta HTTP con el PDF
        response = HttpResponse(buffer, content_type='application/pdf')
        filename = f"Inventario_{datetime.now().strftime('%Y%m%d')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response