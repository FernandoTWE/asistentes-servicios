import { useState, useEffect } from 'react';
import { Listbox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { directusAPI } from '../../lib/api/directus';

export function ServiceSelector({ services = [] }) {
  const [selected, setSelected] = useState(null);

  // Inicializar con el servicio guardado o el primero de la lista
  useEffect(() => {
    const initializeService = async () => {
      if (services.length > 0) {
        const savedServiceId = typeof window !== 'undefined' 
          ? localStorage.getItem('selectedServiceId')
          : null;
        
        const initialServiceId = savedServiceId || services[0].id;
        const fullService = await directusAPI.getServiceById(initialServiceId);
        
        if (fullService?.data) {
          setSelected(fullService.data);
          window.handleServiceChange?.(fullService.data);
        }
      }
    };

    initializeService();
  }, [services]);

  // Manejar cambio de servicio
  const handleServiceChange = async (service) => {
    const fullService = await directusAPI.getServiceById(service.id);
    if (fullService?.data) {
      setSelected(fullService.data);
      window.handleServiceChange?.(fullService.data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedServiceId', service.id);
      }
    }
  };

  return (
    <Listbox value={selected} onChange={handleServiceChange}>
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border focus:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-300">
          <span className="block truncate">
            {selected?.title || 'Seleccione un servicio'}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {services.map((service) => (
            <Listbox.Option
              key={service.id}
              className={({ active }) =>
                clsx(
                  'relative cursor-default select-none py-2 pl-10 pr-4',
                  active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                )
              }
              value={service}
            >
              {({ selected, active }) => (
                <>
                  <span className={clsx('block truncate', selected ? 'font-medium' : 'font-normal')}>
                    {service.title}
                  </span>
                  {selected ? (
                    <span
                      className={clsx(
                        'absolute inset-y-0 left-0 flex items-center pl-3',
                        active ? 'text-primary-600' : 'text-primary-600'
                      )}
                    >
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
}
