from rest_framework.pagination import PageNumberPagination


class FinanzasPendientesPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class MercanciasPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 300


class GastosOperativosPagination(PageNumberPagination):
    page_size = 10  
    page_size_query_param = "page_size"
    max_page_size = 100

class CotizacionesPagination(PageNumberPagination):
    page_size = 10  
    page_size_query_param = "page_size"
    max_page_size = 100
