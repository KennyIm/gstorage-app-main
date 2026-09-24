import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const PrivateRoute = () => {
  const { authTokens, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null 
  }

  return authTokens ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  )
}

export default PrivateRoute