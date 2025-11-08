import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ResponsiveTabItem {
  value: string;
  label: string;
  mobileLabel?: string;
  count?: number;
}

interface ResponsiveTabsProps {
  defaultValue: string;
  value: string;
  onValueChange: (value: string) => void;
  items: ResponsiveTabItem[];
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTabs: React.FC<ResponsiveTabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  items,
  children,
  className = ''
}) => {
  return (
    <Tabs defaultValue={defaultValue} value={value} onValueChange={onValueChange} className={className}>
      {/* Version desktop */}
      <TabsList className="hidden md:grid w-full" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label} {item.count !== undefined && `(${item.count})`}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Version mobile/tablet - scroll horizontal */}
      <div className="md:hidden overflow-x-auto scroll-container">
        <TabsList className="inline-flex w-max min-w-full">
          {items.map((item) => (
            <TabsTrigger 
              key={item.value} 
              value={item.value} 
              className="whitespace-nowrap px-2 text-xs"
            >
              {item.mobileLabel || item.label} {item.count !== undefined && `(${item.count})`}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      
      {children}
    </Tabs>
  );
};

export { TabsContent }; 