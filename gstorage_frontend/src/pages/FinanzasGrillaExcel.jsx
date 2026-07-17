import React, { useState, useEffect, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useUI } from '../context/UIContext'
import apiClient from '../services/api'
import { AllCommunityModule, themeQuartz } from 'ag-grid-community'

export default function AsistenteFacturacion() {
    const gridRef = useRef(null)
    const columnas = useMemo(() => [
        { headerName: "Mes", field: "mes", filter: true, width: 110, pinned: 'left' },
        { headerName: "Fecha Salida", field: "fecha_ingreso", filter: 'agDateColumnFilter', width: 130, pinned: 'left' },
        { headerName: "Ruta", field: "codigo_ruta", filter: 'agTextColumnFilter', width: 110 },
        { headerName: "O/E", field: "numero_orden_entrega", filter: 'agTextColumnFilter', width: 130 },
        { headerName: "Fact/GD/Sol En", field: "factura", filter: 'agTextColumnFilter', width: 140 },
        { headerName: "Cliente", field: "cliente_nombre", filter: 'agTextColumnFilter', width: 200 },
        { headerName: "Proveedor", field: "proveedor_nombre", filter: 'agTextColumnFilter', width: 180, valueFormatter: p => p.value || 'N/A' },
        { headerName: "Destino", field: "destino_nombre", filter: true, width: 150 },
        {
            headerName: "Monto O/E (Neto)",
            field: "precio_total",
            width: 140,
            valueFormatter: p => `$${Math.round(p.value || 0).toLocaleString('es-CL')}`,
            cellStyle: { fontWeight: 'bold' }
        },
        {
            headerName: "Dscto. Aut.",
            field: "descuento_autorizado",
            width: 120,
            valueFormatter: p => `$${Math.round(p.value || 0).toLocaleString('es-CL')}`
        },
        {
            headerName: "IVA",
            valueGetter: () => "19%",
            width: 90
        },
        {
            headerName: "Valor IVA",
            field: "valor_iva",
            width: 130,
            valueFormatter: p => `$${Math.round(p.value || 0).toLocaleString('es-CL')}`
        },
        {
            headerName: "Venta Final",
            field: "venta_final",
            width: 140,
            valueFormatter: p => `$${Math.round(p.value || 0).toLocaleString('es-CL')}`,
            cellClassRules: { 'text-red-400 font-bold': p => p.value > 0 }
        },
        {
            headerName: "Monto Pagado",
            field: "monto_pagado",
            width: 130,
            valueFormatter: p => `$${Math.round(p.value || 0).toLocaleString('es-CL')}`
        },
        {
            headerName: "Deuda",
            field: "deuda",
            width: 130,
            valueFormatter: p => `$${Math.round(p.value || 0).toLocaleString('es-CL')}`,
            cellClassRules: {
                'text-emerald-400 font-semibold': p => p.value === 0,
                'text-red-400 font-semibold': p => p.value > 0
            }
        },
        {
            headerName: "Resp de Pago",
            field: "paga_proveedor",
            width: 140,
            valueFormatter: p => p.value ? 'PROVEEDOR' : 'CLIENTE'
        },
        { headerName: "Forma Pago", valueGetter: () => 'Transferencia', width: 130 },
        { headerName: "Fecha Entreg", field: "fecha_ingreso", width: 130 },
        { headerName: "Día de Pago", valueGetter: () => 'Viernes', width: 110 },
        {
            headerName: "N° Factur (Folio)",
            field: "numero_documento_asociado",
            filter: 'agTextColumnFilter',
            width: 150,
            valueFormatter: p => p.value ? p.value : 'Sin Emitir'
        },
        {
            headerName: "Estado",
            field: "estado_cobranza",
            filter: 'agTextColumnFilter',
            width: 140,
            cellClassRules: {
                'bg-amber-950 text-amber-400 font-bold px-2 rounded text-center': p => p.value === 'Pendiente',
                'bg-emerald-950 text-emerald-400 font-bold px-2 rounded text-center': p => p.value === 'En_Proceso',
                'bg-blue-950 text-blue-400 font-bold px-2 rounded text-center': p => p.value === 'Facturado'
            }
        }
    ], [])

    const defaultColDef = useMemo(() => ({
        sortable: false,
        resizable: true,
        floatingFilter: true
    }), [])
    const datasource = {
        getRows: async (params) => {
            try {
                let urlParams = `?startRow=${params.startRow}&endRow=${params.endRow}`
                const filterModel = params.filterModel;
                if (filterModel.cliente_nombre) urlParams += `&cliente_nombre=${filterModel.cliente_nombre.filter}`
                if (filterModel.codigo_ruta) urlParams += `&codigo_ruta=${filterModel.codigo_ruta.filter}`
                if (filterModel.estado_cobranza) urlParams += `&estado_cobranza=${filterModel.estado_cobranza.filter}`
                if (filterModel.numero_documento_asociado) urlParams += `&numero_documento_asociado=${filterModel.numero_documento_asociado.filter}`

                const res = await apiClient.get(`/api/finanzas/grilla-finanzas/${urlParams}`)
                params.successCallback(res.data.rows, res.data.total)
            } catch (err) {
                params.failCallback()
            }
        }
    }

    return (
        <div className="w-full h-screen p-6 text-white flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <button
                    onClick={() => gridRef.current?.api?.refreshInfiniteCache()}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded text-xs font-semibold transition-colors"
                >
                    Forzar Sincronización
                </button>
            </div>
            <div className="ag-theme-dark flex-1 w-full rounded-xl overflow-hidden border border-slate-800 text-sm shadow-2xl">
                <AgGridReact
                    ref={gridRef}
                    columnDefs={columnas}
                    defaultColDef={defaultColDef}
                    modules={[AllCommunityModule]}
                    theme={themeQuartz}
                    rowModelType="infinite"
                    datasource={datasource}
                    cacheBlockSize={100}
                    maxBlocksInCache={10}
                />
            </div>
        </div>
    )
}