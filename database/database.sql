-- ============================================
-- BASE DE DATOS: prestamos_db
-- Sistema Profesional de Préstamo de Herramientas
-- Control de compras, inventario, préstamos y devoluciones
-- ============================================


CREATE DATABASE prestamos_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE prestamos_db;
-- ============================================
-- PROVEEDORES
-- ============================================
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_comercial VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- CATEGORIAS
-- ============================================
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- HERRAMIENTAS (Inventario principal)
-- ============================================
CREATE TABLE herramientas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idproveedor INT NOT NULL,
    idcategoria INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    codigo VARCHAR(50) UNIQUE,
    numero_serie VARCHAR(100),
    descripcion TEXT,
    precio_compra DECIMAL(10,2),
    stock INT DEFAULT 1,
    estado ENUM('disponible','prestada','mantenimiento','baja') DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_herramienta_proveedor
        FOREIGN KEY (idproveedor) REFERENCES proveedores(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_herramienta_categoria
        FOREIGN KEY (idcategoria) REFERENCES categorias(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    dni VARCHAR(20),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- COMPRAS (Registro general)
-- ============================================
CREATE TABLE compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idproveedor INT NOT NULL,
    fecha_compra DATE NOT NULL,
    total DECIMAL(10,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_compra_proveedor
        FOREIGN KEY (idproveedor) REFERENCES proveedores(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- DETALLE COMPRA
-- ============================================
CREATE TABLE detalle_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idcompra INT NOT NULL,
    idherramienta INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,

    CONSTRAINT fk_detalle_compra_compra
        FOREIGN KEY (idcompra) REFERENCES compras(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_detalle_compra_herramienta
        FOREIGN KEY (idherramienta) REFERENCES herramientas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- PRESTAMOS (Cabecera)
-- ============================================
CREATE TABLE prestamos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idcliente INT NOT NULL,
    fecha_prestamo DATE NOT NULL,
    fecha_devolucion_esperada DATE NOT NULL,
    fecha_cierre DATE,
    estado ENUM('activo','devuelto','vencido') DEFAULT 'activo',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_prestamo_cliente
        FOREIGN KEY (idcliente) REFERENCES clientes(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- DETALLE PRESTAMO (Salida real)
-- ============================================
CREATE TABLE detalle_prestamo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idprestamo INT NOT NULL,
    idherramienta INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    estado_entrega ENUM('nuevo','bueno','regular','dañado') DEFAULT 'bueno',
    observaciones_entrega TEXT,

    CONSTRAINT fk_detalle_prestamo_prestamo
        FOREIGN KEY (idprestamo) REFERENCES prestamos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_detalle_prestamo_herramienta
        FOREIGN KEY (idherramienta) REFERENCES herramientas(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- DEVOLUCIONES (Control de retorno)
-- ============================================
CREATE TABLE devoluciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idprestamo INT NOT NULL,
    iddetalle_prestamo INT NOT NULL,
    fecha_devolucion_real DATE NOT NULL,
    estado_retorno ENUM('igual','bueno','regular','dañado','perdido') DEFAULT 'igual',
    penalidad DECIMAL(10,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_devolucion_prestamo
        FOREIGN KEY (idprestamo) REFERENCES prestamos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_devolucion_detalle
        FOREIGN KEY (iddetalle_prestamo) REFERENCES detalle_prestamo(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- PROVEEDORES
INSERT INTO proveedores (nombre_comercial, telefono, direccion) VALUES
('Ferretería Central SAC', '987654321', 'Av. Industrial 123, Lima'),
('ToolsPro Perú', '976543210', 'Jr. Comercio 456, Lima');

-- CATEGORIAS
INSERT INTO categorias (tipo, nombre) VALUES
('Eléctrica', 'Taladros'),
('Eléctrica', 'Amoladoras'),
('Eléctrica', 'Sierras');

-- HERRAMIENTAS
INSERT INTO herramientas
(idproveedor, idcategoria, nombre, marca, modelo, codigo, numero_serie, descripcion, precio_compra, stock, estado)
VALUES
(1, 1, 'Taladro Percutor 750W', 'Bosch', 'X750', 'TAL-001', 'SERIE-1001', 'Taladro profesional', 350.00, 10, 'disponible'),
(1, 2, 'Amoladora Angular 4.5"', 'Makita', 'AG450', 'AMO-001', 'SERIE-1002', 'Amoladora industrial', 280.00, 5, 'disponible'),
(2, 3, 'Sierra Circular 7.25"', 'DeWalt', 'SC725', 'SIE-001', 'SERIE-1003', 'Sierra de alto rendimiento', 450.00, 7, 'disponible');

-- CLIENTES
INSERT INTO clientes (nombre, dni, direccion, telefono, email) VALUES
('Roberto Silva Mendoza', '45678901', 'Av. Los Pinos 234', '987123456', 'roberto@gmail.com'),
('Carmen Quispe Huanca', '56789012', 'Jr. Las Flores 567', '976234567', 'carmen@gmail.com');

-- COMPRAS
INSERT INTO compras (idproveedor, fecha_compra, total, observaciones) VALUES
(1, '2024-02-20', 630.00, 'Compra inicial'),
(2, '2024-02-22', 450.00, 'Compra sierra');

-- DETALLE COMPRA
INSERT INTO detalle_compra (idcompra, idherramienta, cantidad, precio_unitario) VALUES
(1, 1, 1, 350.00),
(1, 2, 1, 280.00),
(2, 3, 1, 450.00);

-- PRESTAMOS
INSERT INTO prestamos (idcliente, fecha_prestamo, fecha_devolucion_esperada, estado, observaciones) VALUES
(1, '2024-03-01', '2024-03-08', 'activo', 'Préstamo de taladro y amoladora'),
(2, '2024-03-05', '2024-03-10', 'activo', 'Préstamo de sierra');

-- DETALLE PRESTAMO
INSERT INTO detalle_prestamo (idprestamo, idherramienta, cantidad, estado_entrega, observaciones_entrega) VALUES
(1, 1, 1, 'bueno', 'Entregado operativo'),
(1, 2, 1, 'bueno', 'Sin daños'),
(2, 3, 1, 'nuevo', 'Equipo nuevo');

-- DEVOLUCIONES
INSERT INTO devoluciones (idprestamo, iddetalle_prestamo, fecha_devolucion_real, estado_retorno, penalidad, observaciones) VALUES
(1, 1, '2024-03-07', 'igual', 0.00, 'Devuelto en perfecto estado');