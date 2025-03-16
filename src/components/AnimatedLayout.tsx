
import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

interface AnimatedLayoutProps {
  children: ReactNode;
  className?: string;
}

const AnimatedLayout: React.FC<AnimatedLayoutProps> = ({ 
  children,
  className = ''
}) => {
  const location = useLocation();
  
  return (
    <TransitionGroup component={null}>
      <CSSTransition
        key={location.pathname}
        timeout={400}
        classNames="page-transition"
        unmountOnExit
      >
        <div className={`min-h-screen w-full ${className}`}>
          {children}
        </div>
      </CSSTransition>
    </TransitionGroup>
  );
};

export default AnimatedLayout;
