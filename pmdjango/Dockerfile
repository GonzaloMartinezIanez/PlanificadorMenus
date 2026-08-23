# Versión de linux con python instalado
FROM python:3.13-slim

# Evitar usar archivos .pyc dentro del contenedor
ENV PYTHONDONTWRITEBYTECODE=1

# Los mensajes de django se muestran en el log del contenedor
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Actualiza e instala herramientas y luego limpia para reducir el tamaño
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/*

# Instala en el contenedor las dependencias de python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del proyecto
COPY . .

# Sirve el puerto 8000 del contenedor
EXPOSE 8000

# Se lanza la API usando uvicorn
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "3"]
