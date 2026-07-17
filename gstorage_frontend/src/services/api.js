import axios from 'axios'

const API_BASE_URL = ''

let accessTokenEnMemoria = null
let promesaRefreshEnCurso = null
let promesaClientes = null
let promesaProveedores = null

export const setTokenEnMemoria = (token) => {
  accessTokenEnMemoria = token
}

export const clearTokenEnMemoria = () => {
  accessTokenEnMemoria = null
  promesaRefreshEnCurso = null
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
      config.url.includes('/password-reset/')
    ) {
      return config
    }

    if (accessTokenEnMemoria) {
      config.headers['Authorization'] = `Bearer ${accessTokenEnMemoria}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.get = function (url, config) {
    if (url === '/api/inventario/clientes/' || url.includes('/api/inventario/clientes/?')) {
        if (!promesaClientes) {
            promesaClientes = originalGet.call(this, url, config).catch(err => {
                promesaClientes = null 
                return Promise.reject(err)
            })
        }
        return promesaClientes
    }

    if (url === '/api/inventario/proveedores/' || url.includes('/api/inventario/proveedores/?')) {
        if (!promesaProveedores) {
            promesaProveedores = originalGet.call(this, url, config).catch(err => {
                promesaProveedores = null
                return Promise.reject(err)
            })
        }
        return promesaProveedores
    }
    return originalGet.call(this, url, config)
}

export const limpiarCacheCatalogos = () => {
    promesaClientes = null
    promesaProveedores = null
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

  promesaRefreshEnCurso = axios.post('/api/token/refresh/', {}, { withCredentials: true })
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

apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (
        originalRequest.url === '/api/token/' ||
        originalRequest.url === '/api/token/refresh/' ||
        originalRequest.url === '/api/logout/' ||
        originalRequest.url.includes('/password-reset/')
      ) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return apiClient(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      isRefreshing = true

      try {
        const access = await ejecutarRefreshSilencioso()
        originalRequest.headers['Authorization'] = `Bearer ${access}`
        processQueue(null, access)
        return apiClient(originalRequest)

      } catch (_error) {
        console.error("Token de refresco inválido o expirado de forma definitiva.")
        processQueue(_error, null)
        clearTokenEnMemoria()
        if (window.location.pathname !== '/login') {
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