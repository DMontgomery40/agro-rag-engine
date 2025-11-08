// AGRO - TabBar Component
// Main navigation bar using React Router

import { NavLink } from 'react-router-dom';
import { routes } from '../../config/routes';

export function TabBar() {
  // Sort routes by order
  const sortedRoutes = [...routes].sort((a, b) => a.order - b.order);

  return (
    <div className="tab-bar">
      {sortedRoutes.map(route => (
        <NavLink
          key={route.path}
          to={route.path}
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          {route.icon} {route.label}
        </NavLink>
      ))}
    </div>
  );
}
