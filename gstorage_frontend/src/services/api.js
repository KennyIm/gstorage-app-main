import axios from 'axios'

const API_BASE_URL = ''

let accessTokenEnMemoria = null
let promesaRefreshEnCurso = null

const cachePromesasGet = new Map()

export const setTokenEnMemoria = (token) => {
  accessTokenEnMemoria = token
}

export const clearTokenEnMemoria = () => {
  accessTokenEnMemoria = null
  promesaRefreshEnCurso = null
  cachePromesasGet.clear()
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
})

const originalGet = apiClient.get

apiClient.interceptors.request.use(
  (config) => {
    if (
      config.url === '/api/token/' ||
      config.url === '/api/token/refresh/' ||
      config.url.includes('/auth/express/') ||
      config.url.includes('/password-reset/')
    ) {
      return config
    }

    if (accessTokenEnMemoria) {
      config.headers['Authorization'] = `Bearer ${accessTokenEnMemoria}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.get = function (url, config = {}) {
  const esCatalogoPesado =
    url.startsWith('/api/inventario/clientes/') ||
    url.startsWith('/api/inventario/proveedores/')

  if (esCatalogoPesado) {
    const key = url

    if (!cachePromesasGet.has(key)) {
      const configAjustada = {
        ...config,
        timeout: config.timeout || 25000,
      }

      const promesa = originalGet.call(this, url, configAjustada)
        .catch((err) => {
          cachePromesasGet.delete(key)
          return Promise.reject(err)
        })

      cachePromesasGet.set(key, promesa)
    }
    return cachePromesasGet.get(key)
  }

  return originalGet.call(this, url, config)
}

const invalidarCachePorUrl = (url = '') => {
  for (let key of cachePromesasGet.keys()) {
    if (url.includes('/api/inventario/clientes/') && key.includes('/api/inventario/clientes/')) {
      cachePromesasGet.delete(key)
    }
    if (url.includes('/api/inventario/proveedores/') && key.includes('/api/inventario/proveedores/')) {
      cachePromesasGet.delete(key)
    }
  }
}

export const limpiarCacheCatalogos = () => {
  cachePromesasGet.clear()
}

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

export const ejecutarRefreshSilencioso = async () => {
  if (promesaRefreshEnCurso) {
    return promesaRefreshEnCurso
  }

  promesaRefreshEnCurso = axios.post(`${API_BASE_URL}/api/token/refresh/`, {}, { withCredentials: true })
    .then(rs => {
      const { access } = rs.data
      setTokenEnMemoria(access)
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`
      return access
    })
    .catch(err => {
      clearTokenEnMemoria()
      throw err
    })
    .finally(() => {
      promesaRefreshEnCurso = null
    })

  return promesaRefreshEnCurso
}
//TODO Toque cosas aqui en caso de error 
apiClient.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toUpperCase()
    const url = response.config?.url || ''
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      invalidarCachePorUrl(url)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response && error.response.status === 404) {
      const esLectura = !originalRequest.method || originalRequest.method.toUpperCase() === 'GET'
      const saltar404 = originalRequest?.skipGlobal404

      if (esLectura && !saltar404 && window.location.pathname !== '/404') {
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: '/404' }))
        return Promise.reject(error)
      }
    }
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const rutasPublicas = ['/login', '/login-express', '/404']
      const estaEnRutaPublica = rutasPublicas.some(r => window.location.pathname.startsWith(r))
      if (
        estaEnRutaPublica ||
        originalRequest.url.includes('/token/') ||
        originalRequest.url.includes('/token/refresh/') ||
        originalRequest.url.includes('/logout/') ||
        originalRequest.url.includes('/auth/express/') ||
        originalRequest.url.includes('/password-reset/')
      ) {
        return Promise.reject(error)
      }
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return apiClient(originalRequest)
        }).catch(err => Promise.reject(err))
      }
      isRefreshing = true
      try {
        const access = await ejecutarRefreshSilencioso()
        originalRequest.headers['Authorization'] = `Bearer ${access}`
        processQueue(null, access)
        return apiClient(originalRequest)

      } catch (_error) {
        processQueue(_error, null)
        clearTokenEnMemoria()
        
        if (!estaEnRutaPublica) {
          window.location.href = '/login'
        }
        return Promise.reject(_error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient