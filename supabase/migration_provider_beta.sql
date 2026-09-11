-- Migración: Agregar columna 'is_beta' a la tabla 'providers'
-- Los servidores marcados con is_beta = true nunca saldrán por defecto
-- al reproducir ningún contenido. Solo estarán disponibles si el usuario
-- los selecciona de forma explícita en el reproductor.

ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_beta boolean DEFAULT false;

-- Si deseas marcar algún proveedor como beta, puedes ejecutar por ejemplo:
-- UPDATE providers SET is_beta = true WHERE id = 'vidapi';
