#!/bin/bash

# Alternative deployment script for CRM-C4
# Use this script if buildpack deployment fails

set -e

echo "🚀 Starting alternative deployment for CRM-C4..."

# Check if required files exist
required_files=("Dockerfile.optimized" "docker-compose.yml" "package.json" "next.config.ts")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Required file $file not found"
        exit 1
    fi
done

echo "✅ All required files found"

# Build the Docker image locally
echo "🔨 Building Docker image..."
docker build -f Dockerfile.optimized -t crm-c4:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Test the image locally
echo "🧪 Testing Docker image..."
docker run --rm -d --name crm-c4-test -p 3001:3000 \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e HOSTNAME=0.0.0.0 \
    crm-c4:latest

# Wait for the container to start
sleep 10

# Check if the application is responding
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Application is responding correctly"
    docker stop crm-c4-test
else
    echo "❌ Application health check failed"
    docker stop crm-c4-test
    exit 1
fi

echo "🎉 Alternative deployment preparation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Tag your image: docker tag crm-c4:latest your-registry/crm-c4:latest"
echo "2. Push to registry: docker push your-registry/crm-c4:latest"
echo "3. Deploy using the optimized Dockerfile or docker-compose.yml"
echo "4. Use easypanel.yml with buildpack: false setting"
echo ""
echo "💡 Alternative deployment options:"
echo "- Use Docker Compose: docker-compose up -d"
echo "- Deploy to any Docker-compatible platform"
echo "- Use the Dockerfile.optimized for better compatibility"