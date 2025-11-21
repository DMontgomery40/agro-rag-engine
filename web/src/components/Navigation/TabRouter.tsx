// AGRO - TabRouter Component
// Routes configuration for all tabs

import { Routes, Route, Navigate } from 'react-router-dom';
import { routes } from '../../config/routes';
import { createElement, isValidElement } from 'react';

export function TabRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {routes.map(route => {
        // Handle both component types and elements
        const element = isValidElement(route.element)
          ? route.element
          : createElement(route.element as any);

        return (
          <Route key={route.path} path={route.path} element={element} />
        );
      })}
    </Routes>
  );
}
