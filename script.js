// Ensure Three.js is loaded before starting
window.onload = function() {
    // Initialize the Pura Forest application
    const app = new PuraForestApp();
};

/**
 * Pura Pharma Forest - Enhanced Premium Edition
 * A sophisticated visualization of Instagram followers growth
 */
class PuraForestApp {
    constructor() {
        // Initialize state
        this.followers = [];
        this.trees = [];
        this.particles = [];
        this.hoveredTree = null;
        this.currentTimeOfDay = 'day';
        this.currentSeason = 'spring';
        this.currentTerrain = 'normal';
        this.isAutoRotating = false;
        this.isPanelVisible = true;
        this.isFirstPersonMode = false;
        this.isOrbitMode = true;
        this.isUIVisible = true;
        
        // Camera controls
        this.cameraControls = {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            moveSpeed: 0.5,
            rotateSpeed: 0.002,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            mouseSensitivity: 0.003,
            touchSensitivity: 0.005
        };
        
        // Define chapters configuration with expanded terrain
        this.chapters = [
            { id: 1, min: 1, max: 100, position: { x: 0, z: 0 }, radius: 120 },
            { id: 2, min: 101, max: 599, position: { x: 0, z: -250 }, radius: 140 },
            { id: 3, min: 600, max: 1500, position: { x: 250, z: 0 }, radius: 150 },
            { id: 4, min: 1501, max: 3000, position: { x: -250, z: 0 }, radius: 160 }
        ];
        
        // Setup loading screen
        this.setupLoading();
        
        // Initialize the scene
        this.initScene();
        
        // Initialize the UI
        this.initUI();
        
        // Create environment elements
        this.createEnvironment();
        this.createTreeTemplates();
        
        // Create particle systems
        this.createParticleSystems();
        
        // Start simulation with sample data
        this.setupSampleData();
        
        // Start animation loop
        this.animate();
        
        // Check if we're on mobile and set up accordingly
        this.initTouchControls();
    }
    
    setupLoading() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressFill = document.getElementById('progress-fill');
        
        // Create a more realistic loading sequence
        let progress = 0;
        const loadingSteps = [
            { progress: 10, message: "Initializing scene..." },
            { progress: 25, message: "Creating environment..." },
            { progress: 40, message: "Growing trees..." },
            { progress: 60, message: "Adding wildlife..." },
            { progress: 75, message: "Setting up controls..." },
            { progress: 90, message: "Finalizing forest..." },
            { progress: 100, message: "Welcome to Pura Forest!" }
        ];
        
        let currentStep = 0;
        
        const loadingInterval = setInterval(() => {
            if (currentStep < loadingSteps.length) {
                const step = loadingSteps[currentStep];
                progress = step.progress;
                this.progressFill.style.width = `${progress}%`;
                
                // Update subtitle text with loading message
                const subtitle = document.querySelector('.loader-subtitle');
                if (subtitle) {
                    subtitle.textContent = step.message;
                }
                
                currentStep++;
            } else {
                clearInterval(loadingInterval);
                setTimeout(() => {
                    this.loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        this.loadingScreen.style.display = 'none';
                    }, 600);
                }, 500);
            }
        }, 400);
    }
    
    initScene() {
        // Create container
        this.container = document.getElementById('canvas-container');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f8ff); // Light blue-white background
        
        // Create camera with wider field of view for better landscape view
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(180, 100, 180);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer with better quality
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadows
        this.container.appendChild(this.renderer.domElement);
        
        // Set up raycaster for interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Add event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('wheel', this.onMouseWheel.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Touch events
        this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        
        // Setup orbit controls
        this.setupOrbitControls();
        
        // Show keyboard controls
        this.keyboardControls = document.getElementById('keyboard-controls');
        setTimeout(() => {
            this.keyboardControls.classList.add('visible');
            setTimeout(() => {
                this.keyboardControls.classList.remove('visible');
            }, 5000);
        }, 2000);
        
        // Setup Performance monitor for development
        this.setupPerformanceMonitor();
    }
    
    setupPerformanceMonitor() {
        // Performance monitoring - only in development
        this.stats = {
            fps: 0,
            frameTime: 0,
            memory: 0,
            treeCount: 0,
            lastCalcTime: 0,
        };
    }
    
    setupOrbitControls() {
        // Orbit parameters
        this.orbitRadius = 200;
        this.orbitSpeed = 0.1;
        this.orbitAngle = 0;
        this.orbitHeight = 100;
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.pinchDistance = 0;
    }
    
    initTouchControls() {
        // Detect if we're on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            // Adjust camera for mobile view
            this.camera.fov = 70; // Wider FOV for mobile
            this.camera.updateProjectionMatrix();
            
            // Enhance touch sensitivity
            this.cameraControls.touchSensitivity = 0.008;
            
            // Add pinch-to-zoom handler
            this.renderer.domElement.addEventListener('touchmove', this.handlePinchZoom.bind(this), { passive: false });
            
            // Adjust UI elements for mobile
            document.querySelectorAll('.ui-card').forEach(card => {
                card.classList.add('mobile');
            });
            
            // Auto-hide panel on mobile after a delay
            setTimeout(() => {
                this.toggleControlPanel();
            }, 5000);
        }
    }
    
    handlePinchZoom(event) {
        if (event.touches.length !== 2) return;
        
        event.preventDefault();
        
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const distance = Math.hypot(
            touch1.pageX - touch2.pageX,
            touch1.pageY - touch2.pageY
        );
        
        if (this.lastPinchDistance) {
            const delta = this.lastPinchDistance - distance;
            this.orbitRadius = Math.max(50, Math.min(500, this.orbitRadius + delta * 0.5));
            
            // Update camera position
            this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
            this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
            this.camera.lookAt(this.targetPosition);
        }
        
        this.lastPinchDistance = distance;
    }
    
    /**
     * Improved Perlin Noise implementation for better natural terrain
     */
    perlinNoise(x, y, z = 0) {
        // Based on improved Perlin noise algorithm
        function fade(t) {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }
        
        function lerp(t, a, b) {
            return a + t * (b - a);
        }
        
        function grad(hash, x, y, z) {
            const h = hash & 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        }
        
        // Permutation table
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        
        // Double permutation to avoid overflow
        const perm = new Array(512);
        const permMod12 = new Array(512);
        for (let i = 0; i < 512; i++) {
            perm[i] = p[i & 255];
            permMod12[i] = perm[i] % 12;
        }
        
        // Skew the input space to determine which simplex cell we're in
        const F3 = 1.0 / 3.0;
        const G3 = 1.0 / 6.0;
        
        // Find unit grid cell containing point
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        let Z = Math.floor(z) & 255;
        
        // Get relative xyz coordinates of point within that cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        // Compute fade curves for each of x, y, z
        const u = fade(x);
        const v = fade(y);
        const w = fade(z);
        
        // Hash coordinates of the 8 cube corners
        const A = perm[X] + Y;
        const AA = perm[A] + Z;
        const AB = perm[A + 1] + Z;
        const B = perm[X + 1] + Y;
        const BA = perm[B] + Z;
        const BB = perm[B + 1] + Z;
        
        // And add blended results from 8 corners of cube
        return lerp(w, lerp(v, lerp(u, grad(perm[AA], x, y, z),
                                    grad(perm[BA], x - 1, y, z)),
                            lerp(u, grad(perm[AB], x, y - 1, z),
                                    grad(perm[BB], x - 1, y - 1, z))),
                    lerp(v, lerp(u, grad(perm[AA + 1], x, y, z - 1),
                                    grad(perm[BA + 1], x - 1, y, z - 1)),
                            lerp(u, grad(perm[AB + 1], x, y - 1, z - 1),
                                    grad(perm[BB + 1], x - 1, y - 1, z - 1))));
    }
    
    createEnvironment() {
        // Create enhanced terrain
        this.createTerrainWithImprovedHeightmap();
        
        // Create sky
        this.createSky();
        
        // Add lighting
        this.createLighting();
        
        // Add water features
        this.createLake();
        
        // Add decorative elements
        this.createPathways();
        this.createRocks();
        this.createGrass();
        this.createFlowers();
        this.createWildlife();
    }
    
    createTerrainWithImprovedHeightmap() {
        // Create a more interesting ground with natural height variations
        const terrainSize = 2500;
        const resolution = 128; // Adjusted for performance
        this.terrainResolution = resolution;
        
        // Different heightmaps based on selected terrain type
        const heightScales = {
            normal: 15,
            hills: 30,
            valleys: 25
        };
        
        const heightScale = heightScales[this.currentTerrain];
        
        // Generate heightmap using improved Perlin noise
        this.heightmap = new Float32Array(resolution * resolution);
        
        // Multiple octaves of noise for more natural terrain
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const index = i * resolution + j;
                
                // Convert to normalized coordinates
                const x = i / resolution;
                const y = j / resolution;
                
                // Use multiple octaves for more natural-looking terrain
                let elevation = 0;
                let frequency = 1;
                let amplitude = 1;
                const octaves = 6;
                
                for (let k = 0; k < octaves; k++) {
                    elevation += this.perlinNoise(x * frequency, y * frequency) * amplitude;
                    amplitude *= 0.5;
                    frequency *= 2;
                }
                
                switch (this.currentTerrain) {
                    case 'normal':
                        this.heightmap[index] = elevation * heightScale;
                        break;
                    case 'hills':
                        // More pronounced peaks and valleys
                        this.heightmap[index] = Math.pow(elevation, 1.5) * heightScale;
                        break;
                    case 'valleys':
                        // Create deeper valleys
                        this.heightmap[index] = (Math.abs(elevation) < 0.2 ? 
                                              elevation * 0.5 : 
                                              elevation) * heightScale;
                        break;
                }
            }
        }
        
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, resolution-1, resolution-1);
        
        // Apply heightmap to vertices
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length/3; i++) {
            vertices[i*3+2] = this.heightmap[i]; // Set Z value from heightmap
        }
        
        groundGeometry.rotateX(-Math.PI / 2);
        groundGeometry.computeVertexNormals();
        
        // Create material with better texture
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x8bc34a,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: false
        });
        
        // Apply seasonal colors
        this.updateGroundForSeason(groundMaterial);
        
        // Create ground mesh
        if (this.ground) {
            this.scene.remove(this.ground);
        }
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Create chapter areas with raised platforms
        this.chapters.forEach(chapter => {
            this.createChapterGround(chapter);
        });
    }
    
    updateGroundForSeason(material) {
        // Update ground color based on season
        const seasonalColors = {
            spring: 0x8bc34a, // Vibrant green
            summer: 0x689f38, // Deep green
            autumn: 0xd84315, // Reddish-brown
            winter: 0xe0f7fa  // Light blue-white
        };
        
        if (material) {
            material.color.setHex(seasonalColors[this.currentSeason]);
        }
    }
    
    updateTerrainType(terrainType) {
        if (this.currentTerrain === terrainType) return;
        
        this.currentTerrain = terrainType;
        
        // Update UI
        document.querySelectorAll('.terrain-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-terrain="${terrainType}"]`).classList.add('active');
        
        // Recreate terrain with new heightmap
        this.createTerrainWithImprovedHeightmap();
        
        // Update trees positions to match new terrain
        this.updateTreesForNewTerrain();
    }
    
    updateTreesForNewTerrain() {
        // Update tree positions to match new terrain heights
        this.trees.forEach(tree => {
            const x = tree.position.x;
            const z = tree.position.z;
            
            // Calculate terrain height at this position
            const height = this.getTerrainHeightAtPosition(x, z);
            
            // Smoothly animate tree to new height
            gsap.to(tree.mesh.position, {
                y: height,
                duration: 1.5,
                ease: "elastic.out(1, 0.5)"
            });
        });
    }
    
    getTerrainHeightAtPosition(x, z) {
        // Convert world position to heightmap coordinates
        const terrainSize = 2500;
        const halfSize = terrainSize / 2;
        
        // Normalize to 0-1
        const normX = (x + halfSize) / terrainSize;
        const normZ = (z + halfSize) / terrainSize;
        
        // Convert to heightmap indices
        const i = Math.floor(normX * (this.terrainResolution - 1));
        const j = Math.floor(normZ * (this.terrainResolution - 1));
        
        // Check bounds
        if (i < 0 || i >= this.terrainResolution || j < 0 || j >= this.terrainResolution) {
            return 0;
        }
        
        // Get height from heightmap
        const index = i * this.terrainResolution + j;
        return this.heightmap[index];
    }
    
    createChapterGround(chapter) {
        // Create circular platform for each chapter
        const geometry = new THREE.CircleGeometry(chapter.radius, 64);
        
        // Seasonal colors
        const chapterColors = {
            spring: { primary: 0x9ccc65, secondary: 0x7cb342 },
            summer: { primary: 0x8bc34a, secondary: 0x689f38 },
            autumn: { primary: 0xe57373, secondary: 0xef6c00 },
            winter: { primary: 0xe0f7fa, secondary: 0xb3e5fc }
        };
        
        const colors = chapterColors[this.currentSeason];
        
        const material = new THREE.MeshStandardMaterial({
            color: chapter.id === 1 ? colors.primary : colors.secondary,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Remove previous platform if exists
        if (chapter.platform) {
            this.scene.remove(chapter.platform);
        }
        
        const platform = new THREE.Mesh(geometry, material);
        platform.rotation.x = -Math.PI / 2;
        
        // Get terrain height at chapter center
        const centerHeight = this.getTerrainHeightAtPosition(
            chapter.position.x,
            chapter.position.z
        );
        
        platform.position.set(
            chapter.position.x,
            centerHeight + 0.1, // Slightly raised above terrain
            chapter.position.z
        );
        platform.receiveShadow = true;
        this.scene.add(platform);
        
        // Add subtle grid helper for visual reference
        if (chapter.gridHelper) {
            this.scene.remove(chapter.gridHelper);
        }
        
        const gridSize = chapter.radius * 2;
        const divisions = chapter.id === 1 ? 10 : 20;
        const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x000000, 0x444444);
        gridHelper.position.set(
            chapter.position.x,
            centerHeight + 0.11, // Just above platform
            chapter.position.z
        );
        
        // Make grid lines subtle
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.15;
        
        // Store chapter platform for seasonal updates
        chapter.platform = platform;
        chapter.gridHelper = gridHelper;
        this.scene.add(gridHelper);
        
        // Add text label for chapter
        this.createChapterLabel(chapter, centerHeight);
    }
    
    createChapterLabel(chapter, centerHeight) {
        // Remove previous label if exists
        if (chapter.label) {
            this.scene.remove(chapter.label);
        }
        
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        // Clear canvas
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw chapter number
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.font = 'bold 48px Inter';
        context.fillText(`CHAPTER ${chapter.id}`, canvas.width / 2, canvas.height / 2 - 10);
        
        // Draw range
        context.font = '16px Inter';
        context.fillText(`${chapter.min}-${chapter.max} followers`, canvas.width / 2, canvas.height / 2 + 30);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.position.set(
            chapter.position.x,
            centerHeight + 15, // Height above ground
            chapter.position.z
        );
        sprite.scale.set(30, 15, 1);
        
        chapter.label = sprite;
        this.scene.add(sprite);
    }
    
    createLake() {
        // Remove previous lake if exists
        if (this.lake) {
            this.scene.remove(this.lake);
        }
        
        // Create a reflective lake with animated water
        const lakeGeometry = new THREE.CircleGeometry(180, 64);
        
        // Different colors based on season
        const lakeColors = {
            spring: 0x4fc3f7, // Bright blue
            summer: 0x039be5, // Deep blue
            autumn: 0x0277bd, // Dark blue
            winter: 0x90caf9  // Light icy blue
        };
        
        const lakeMaterial = new THREE.MeshStandardMaterial({
            color: lakeColors[this.currentSeason],
            metalness: 0.9,
            roughness: 0.1,
            opacity: 0.8,
            transparent: true
        });
        
        const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
        lake.rotation.x = -Math.PI / 2;
        
        // Get terrain height at lake position
        const lakeX = 100;
        const lakeZ = -120;
        const lakeHeight = this.getTerrainHeightAtPosition(lakeX, lakeZ);
        
        lake.position.set(lakeX, lakeHeight + 0.5, lakeZ);
        this.lake = lake;
        this.scene.add(lake);
        
        // Add lake border/shore
        const shoreMaterial = new THREE.MeshStandardMaterial({
            color: 0xd2b48c, // Sand color
            metalness: 0.1,
            roughness: 0.9
        });
        
        const shoreGeometry = new THREE.RingGeometry(180, 190, 64);
        const shore = new THREE.Mesh(shoreGeometry, shoreMaterial);
        shore.rotation.x = -Math.PI / 2;
        shore.position.set(lakeX, lakeHeight + 0.4, lakeZ);
        this.scene.add(shore);
    }
    
    createSky() {
        // Create a large skydome
        const skyGeometry = new THREE.SphereGeometry(1500, 32, 32);
        skyGeometry.scale(-1, 1, 1); // Flip inside out
        
        // Create shader material for sky with gradient
        this.skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        this.sky = new THREE.Mesh(skyGeometry, this.skyMaterial);
        this.scene.add(this.sky);
    }
    
    createLighting() {
        // Main directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(50, 100, 50);
        this.sunLight.castShadow = true;
        
        // Optimize shadows
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        
        this.scene.add(this.sunLight);
        
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);
        
        // Hemisphere light for subtle sky/ground color variation
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
        this.hemiLight.color.setHSL(0.6, 1, 0.6);
        this.hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        this.hemiLight.position.set(0, 50, 0);
        this.scene.add(this.hemiLight);
        
        // Add subtle point lights for atmosphere
        this.createAtmosphericLights();
        
        // Set initial time of day
        this.setTimeOfDay('day');
    }
    
    createAtmosphericLights() {
        // Create point lights in strategic locations
        const lightPositions = [
            { x: 100, y: 5, z: -120, color: 0x4fc3f7, intensity: 1.5 }, // Lake
            { x: 0, y: 5, z: 0, color: 0x9ccc65, intensity: 1.2 }      // Center
        ];
        
        this.atmosphericLights = [];
        
        lightPositions.forEach(pos => {
            const light = new THREE.PointLight(pos.color, pos.intensity, 150);
            light.position.set(pos.x, pos.y, pos.z);
            
            // Add subtle animation
            light.originalY = pos.y;
            light.originalIntensity = pos.intensity;
            
            this.atmosphericLights.push(light);
            this.scene.add(light);
        });
    }
    
    createPathways() {
        // Remove previous paths if they exist
        if (this.paths) {
            this.paths.forEach(path => {
                this.scene.remove(path);
            });
        }
        
        this.paths = [];
        
        // Create decorative pathways connecting chapters
        this.chapters.forEach((chapter, index) => {
            if (index === 0) return; // Skip first chapter
            
            const centerChapter = this.chapters[0]; // Always connect to center
            
            const startPoint = new THREE.Vector3(centerChapter.position.x, 0, centerChapter.position.z);
            const endPoint = new THREE.Vector3(chapter.position.x, 0, chapter.position.z);
            
            const distance = startPoint.distanceTo(endPoint);
            const direction = endPoint.clone().sub(startPoint).normalize();
            
            // Adjust start and end points to be at the edge of each chapter area
            const startOffset = direction.clone().multiplyScalar(centerChapter.radius);
            const endOffset = direction.clone().multiplyScalar(-chapter.radius);
            
            const adjustedStart = startPoint.clone().add(startOffset);
            const adjustedEnd = endPoint.clone().add(endOffset);
            
            // Generate path points with natural curves
            const pathPoints = this.generateCurvedPathPoints(adjustedStart, adjustedEnd, 10);
            
            // Create path segments
            for (let i = 1; i < pathPoints.length; i++) {
                const start = pathPoints[i-1];
                const end = pathPoints[i];
                
                // Vector from start to end
                const pathVector = end.clone().sub(start);
                const pathLength = pathVector.length();
                const pathDirection = pathVector.normalize();
                
                // Get terrain heights
                const startHeight = this.getTerrainHeightAtPosition(start.x, start.z);
                const endHeight = this.getTerrainHeightAtPosition(end.x, end.z);
                
                // Create path segment
                const pathGeometry = new THREE.PlaneGeometry(pathLength, 12);
                
                const pathMaterial = new THREE.MeshStandardMaterial({
                    color: 0xd7ccc8,
                    roughness: 0.9,
                    metalness: 0.1
                });
                
                const path = new THREE.Mesh(pathGeometry, pathMaterial);
                path.rotation.x = -Math.PI / 2;
                
                // Position in the middle
                const midPoint = start.clone().add(end).multiplyScalar(0.5);
                const midHeight = (startHeight + endHeight) / 2;
                path.position.set(midPoint.x, midHeight + 0.1, midPoint.z); // Slightly above terrain
                
                // Rotate to face the correct direction
                path.lookAt(end.x, midHeight + 0.1, end.z);
                
                path.receiveShadow = true;
                this.scene.add(path);
                this.paths.push(path);
            }
            
            // Add decorative elements along the path
            this.addPathDecorations(pathPoints);
        });
    }
    
    generateCurvedPathPoints(start, end, segments) {
        const points = [];
        
        // Create control points for curve
        const midPoint = start.clone().add(end).multiplyScalar(0.5);
        const perpendicular = new THREE.Vector3(-(end.z - start.z), 0, end.x - start.x).normalize();
        
        // Add some randomness to the curve
        const curveAmount = 30 + Math.random() * 50; // Random curve amount
        const controlPoint = midPoint.clone().add(perpendicular.multiplyScalar(curveAmount));
        
        // Generate points along a quadratic curve
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            
            // Quadratic Bezier curve
            const point = new THREE.Vector3();
            point.x = Math.pow(1-t, 2) * start.x + 2 * (1-t) * t * controlPoint.x + Math.pow(t, 2) * end.x;
            point.z = Math.pow(1-t, 2) * start.z + 2 * (1-t) * t * controlPoint.z + Math.pow(t, 2) * end.z;
            
            points.push(point);
        }
        
        return points;
    }
    
    addPathDecorations(pathPoints) {
        // Add decorative elements along paths
        for (let i = 1; i < pathPoints.length - 1; i += 2) {
            const point = pathPoints[i];
            
            // Get terrain height
            const height = this.getTerrainHeightAtPosition(point.x, point.z);
            
            // Add a lantern or decorative stone
            if (Math.random() > 0.5) {
                this.createLantern(point.x, height, point.z);
            } else {
                this.createDecorativeStone(point.x, height, point.z);
            }
        }
    }
    
    createLantern(x, y, z) {
        // Create lantern
        const lanternGroup = new THREE.Group();
        
        // Post
        const postGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 6);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x5d4037,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 2;
        post.castShadow = true;
        lanternGroup.add(post);
        
        // Lantern housing
        const housingGeometry = new THREE.BoxGeometry(2, 2, 2);
        const housingMaterial = new THREE.MeshStandardMaterial({
            color: 0x795548,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        housing.position.y = 5;
        housing.castShadow = true;
        lanternGroup.add(housing);
        
        // Light
        const lightGeometry = new THREE.SphereGeometry(0.7, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffeb3b,
            transparent: true,
            opacity: 0.8
        });
        
        const lightOrb = new THREE.Mesh(lightGeometry, lightMaterial);
        lightOrb.position.y = 5;
        lanternGroup.add(lightOrb);
        
        // Add a point light
        const light = new THREE.PointLight(0xffeb3b, 1, 20);
        light.position.y = 5;
        lanternGroup.add(light);
        
        // Position and add to scene
        lanternGroup.position.set(x, y, z);
        this.scene.add(lanternGroup);
    }
    
    createDecorativeStone(x, y, z) {
        // Create decorative stone
        const geometry = new THREE.DodecahedronGeometry(1.5, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0x9e9e9e,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const stone = new THREE.Mesh(geometry, material);
        stone.position.set(x, y + 0.5, z);
        stone.rotation.y = Math.random() * Math.PI * 2;
        stone.rotation.z = Math.random() * 0.3;
        stone.scale.set(
            1 + Math.random() * 0.5,
            0.6 + Math.random() * 0.3,
            1 + Math.random() * 0.5
        );
        
        stone.castShadow = true;
        stone.receiveShadow = true;
        this.scene.add(stone);
    }
    
    createRocks() {
        // Remove previous rocks if they exist
        if (this.rocks) {
            this.rocks.forEach(rock => {
                this.scene.remove(rock);
            });
        }
        
        this.rocks = [];
        
        // Create some decorative rocks
        const rockPositions = [
            { x: -120, z: -80, scale: 2.5 },
            { x: 150, z: -120, scale: 1.8 },
            { x: -200, z: 50, scale: 3.2 },
            { x: 80, z: 180, scale: 2.0 },
            { x: -80, z: 120, scale: 1.5 },
            { x: 200, z: -50, scale: 2.8 },
            { x: -150, z: -180, scale: 2.2 }
        ];
        
        rockPositions.forEach(pos => {
            // Different types of rock geometry for variety
            const geometries = [
                new THREE.DodecahedronGeometry(5, 0),
                new THREE.IcosahedronGeometry(5, 0),
                new THREE.OctahedronGeometry(5, 0)
            ];
            
            const rockGeometry = geometries[Math.floor(Math.random() * geometries.length)];
            
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: 0x757575,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            // Get terrain height at rock position
            const height = this.getTerrainHeightAtPosition(pos.x, pos.z);
            
            rock.position.set(pos.x, height, pos.z);
            rock.scale.set(pos.scale, pos.scale * 0.7, pos.scale);
            rock.rotation.y = Math.random() * Math.PI * 2;
            rock.rotation.z = Math.random() * 0.2;
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
            this.rocks.push(rock);
        });
    }
    
    createGrass() {
        // Remove previous grass if it exists
        if (this.grass) {
            this.grass.forEach(grass => {
                this.scene.remove(grass);
            });
        }
        
        this.grass = [];
        
        // Only add grass in spring and summer
        if (this.currentSeason === 'autumn' || this.currentSeason === 'winter') return;
        
        const grassPositions = [];
        
        // Generate random grass positions
        for (let i = 0; i < 500; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 400;
            grassPositions.push({
                x: Math.cos(angle) * distance,
                z: Math.sin(angle) * distance
            });
        }
        
        // Create grass tufts
        grassPositions.forEach(pos => {
            // Skip if position is too close to any chapter center
            for (const chapter of this.chapters) {
                const distToChapter = Math.sqrt(
                    Math.pow(pos.x - chapter.position.x, 2) +
                    Math.pow(pos.z - chapter.position.z, 2)
                );
                if (distToChapter < chapter.radius) return;
            }
            
            // Get terrain height at grass position
            const height = this.getTerrainHeightAtPosition(pos.x, pos.z);
            
            // Create improved grass model
            const grassGroup = new THREE.Group();
            
            // Multiple blades for each tuft
            const bladeCount = 3 + Math.floor(Math.random() * 4);
            const grassColor = this.currentSeason === 'spring' ? 0x9ccc65 : 0x8bc34a;
            
            for (let i = 0; i < bladeCount; i++) {
                const bladeGeometry = new THREE.PlaneGeometry(1 + Math.random(), 1.5 + Math.random() * 2);
                const bladeMaterial = new THREE.MeshBasicMaterial({
                    color: grassColor,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });
                
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
                blade.position.set(
                    (Math.random() - 0.5) * 1.5,
                    bladeGeometry.parameters.height / 2,
                    (Math.random() - 0.5) * 1.5
                );
                blade.rotation.y = Math.random() * Math.PI;
                blade.rotation.x = Math.random() * 0.2;
                
                grassGroup.add(blade);
            }
            
            grassGroup.position.set(pos.x, height, pos.z);
            
            this.grass.push(grassGroup);
            this.scene.add(grassGroup);
        });
    }
    
    createFlowers() {
        // Remove previous flowers if they exist
        if (this.flowers) {
            this.flowers.forEach(flower => {
                this.scene.remove(flower);
            });
        }
        
        this.flowers = [];
        
        // Only add flowers in spring and summer
        if (this.currentSeason === 'autumn' || this.currentSeason === 'winter') return;
        
        // Generate random flower positions
        const flowerCount = this.currentSeason === 'spring' ? 200 : 100;
        
        for (let i = 0; i < flowerCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 400;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Skip if position is too close to any chapter center
            let skipFlower = false;
            for (const chapter of this.chapters) {
                const distToChapter = Math.sqrt(
                    Math.pow(x - chapter.position.x, 2) +
                    Math.pow(z - chapter.position.z, 2)
                );
                if (distToChapter < chapter.radius) {
                    skipFlower = true;
                    break;
                }
            }
            if (skipFlower) continue;
            
            // Get terrain height
            const height = this.getTerrainHeightAtPosition(x, z);
            
            // Create a flower
            this.createFlower(x, height, z);
        }
    }
    
    createFlower(x, y, z) {
        const flowerGroup = new THREE.Group();
        
        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 5);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x33691e,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 1;
        flowerGroup.add(stem);
        
        // Flower petals
        const flowerColors = [
            0xec407a, // Pink
            0x7e57c2, // Purple
            0x42a5f5, // Blue
            0xffeb3b, // Yellow
            0xff7043  // Orange
        ];
        
        const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        
        const petalGeometry = new THREE.CircleGeometry(0.5, 8);
        const petalMaterial = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        
        // Create multiple petals
        const petalCount = 5 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < petalCount; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);
            const angle = (i / petalCount) * Math.PI * 2;
            
            petal.position.set(
                Math.cos(angle) * 0.3,
                2,
                Math.sin(angle) * 0.3
            );
            
            petal.rotation.x = Math.PI / 2;
            petal.rotation.y = angle;
            
            flowerGroup.add(petal);
        }
        
        // Center of flower
        const centerGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const centerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffca28 // Yellow center
        });
        
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = 2;
        flowerGroup.add(center);
        
        // Position and add to scene
        flowerGroup.position.set(x, y, z);
        flowerGroup.rotation.y = Math.random() * Math.PI * 2;
        
        this.flowers.push(flowerGroup);
        this.scene.add(flowerGroup);
    }
    
    createWildlife() {
        // Only in spring and summer
        if (this.currentSeason === 'autumn' || this.currentSeason === 'winter') return;
        
        // Create simple butterfly or bird models
        const wildlifeCount = 10;
        
        for (let i = 0; i < wildlifeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 200;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            const height = this.getTerrainHeightAtPosition(x, z);
            const y = height + 5 + Math.random() * 10;
            
            if (Math.random() > 0.5) {
                this.createButterfly(x, y, z);
            } else {
                this.createBird(x, y, z);
            }
        }
    }
    
    createButterfly(x, y, z) {
        const butterflyGroup = new THREE.Group();
        
        // Wings
        const wingGeometry = new THREE.CircleGeometry(1, 8);
        const wingMaterial = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xec407a : 0x42a5f5,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.x = -0.5;
        leftWing.rotation.y = Math.PI / 4;
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.x = 0.5;
        rightWing.rotation.y = -Math.PI / 4;
        
        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 5);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0x212121
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        
        butterflyGroup.add(leftWing);
        butterflyGroup.add(rightWing);
        butterflyGroup.add(body);
        
        butterflyGroup.position.set(x, y, z);
        
        // Add animation data
        butterflyGroup.userData = {
            originalY: y,
            speed: 0.2 + Math.random() * 0.3,
            wingSpeed: 3 + Math.random() * 5,
            phase: Math.random() * Math.PI * 2
        };
        
        if (!this.butterflies) this.butterflies = [];
        this.butterflies.push(butterflyGroup);
        this.scene.add(butterflyGroup);
    }
    
    createBird(x, y, z) {
        const birdGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.ConeGeometry(0.5, 1.5, 4);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0x795548
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        birdGroup.add(body);
        
        // Wings
        const wingGeometry = new THREE.PlaneGeometry(2, 0.8);
        const wingMaterial = new THREE.MeshBasicMaterial({
            color: 0x5d4037,
            side: THREE.DoubleSide
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-1, 0, 0);
        birdGroup.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(1, 0, 0);
        birdGroup.add(rightWing);
        
        birdGroup.position.set(x, y, z);
        
        // Add animation data
        birdGroup.userData = {
            originalY: y,
            speed: 0.4 + Math.random() * 0.3,
            wingSpeed: 2 + Math.random() * 3,
            phase: Math.random() * Math.PI * 2,
            direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
        };
        
        if (!this.birds) this.birds = [];
        this.birds.push(birdGroup);
        this.scene.add(birdGroup);
    }
    
    createTreeTemplates() {
        this.treeTemplates = [];
        this.seasonalTreeMaterials = {
            spring: {
                conifer: { color: 0x33a02c, roughness: 0.8, metalness: 0.05 },
                broadleaf: { color: 0x66bb6a, roughness: 0.8, metalness: 0.05 },
                lowpoly: { color: 0x4caf50, roughness: 0.8, metalness: 0.05 },
                trunk: { color: 0x8d6e63, roughness: 0.9, metalness: 0.1 }
            },
            summer: {
                conifer: { color: 0x228B22, roughness: 0.7, metalness: 0.1 },
                broadleaf: { color: 0x2e7d32, roughness: 0.7, metalness: 0.1 },
                lowpoly: { color: 0x388e3c, roughness: 0.7, metalness: 0.1 },
                trunk: { color: 0x795548, roughness: 0.9, metalness: 0.1 }
            },
            autumn: {
                conifer: { color: 0x33691e, roughness: 0.8, metalness: 0.05 },
                broadleaf: { color: 0xff5722, roughness: 0.8, metalness: 0.05 },
                lowpoly: { color: 0xe65100, roughness: 0.8, metalness: 0.05 },
                trunk: { color: 0x5d4037, roughness: 0.9, metalness: 0.1 }
            },
            winter: {
                conifer: { color: 0x78909c, roughness: 0.8, metalness: 0.2 },
                broadleaf: { color: 0xb0bec5, roughness: 0.8, metalness: 0.2 },
                lowpoly: { color: 0x90a4ae, roughness: 0.8, metalness: 0.2 },
                trunk: { color: 0x4e342e, roughness: 0.9, metalness: 0.1 }
            }
        };
        
        // Create tree models with improved detail
        this.treeTemplates.push(this.createDetailedConifer());
        this.treeTemplates.push(this.createDetailedOak());
        this.treeTemplates.push(this.createDetailedPine());
        this.treeTemplates.push(this.createLowPolyTree());
        this.treeTemplates.push(this.createBlossomTree());
        this.treeTemplates.push(this.createMapleTree());
        this.treeTemplates.push(this.createWillowTree());
    }
    
    createDetailedConifer() {
        const tree = new THREE.Group();
        const materials = this.seasonalTreeMaterials[this.currentSeason];
        
        // Create detailed trunk with bark texture effect
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 6, 10);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Create foliage with multiple layers for realism
        for (let i = 0; i < 4; i++) {
            const y = 4 + i * 2.5;
            const size = 4 - i * 0.7;
            
            const foliageGeometry = new THREE.ConeGeometry(size, 3, 16);
            const foliageMaterial = new THREE.MeshStandardMaterial(materials.conifer);
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = y;
            foliage.castShadow = true;
            tree.add(foliage);
        }
        
        return tree;
    }
    
    createDetailedOak() {
        const tree = new THREE.Group();
        const materials = this.seasonalTreeMaterials[this.currentSeason];
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 6, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Add branches
        const addBranch = (startY, length, thickness, angle) => {
            const branchGeometry = new THREE.CylinderGeometry(thickness * 0.7, thickness, length, 5);
            branchGeometry.translate(0, length / 2, 0);
            branchGeometry.rotateZ(angle);
            
            const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
            branch.position.y = startY;
            branch.castShadow = true;
            tree.add(branch);
            
            // Add leaf clusters at branch ends
            if (this.currentSeason !== 'winter') {
                const leafCluster = new THREE.Mesh(
                    new THREE.SphereGeometry(length * 0.4, 6, 6),
                    new THREE.MeshStandardMaterial(materials.broadleaf)
                );
                
                leafCluster.position.set(
                    Math.sin(angle) * length,
                    startY + Math.cos(angle) * length,
                    0
                );
                leafCluster.castShadow = true;
                tree.add(leafCluster);
            }
        };
        
        // Add 4-5 branches at different heights and angles
        addBranch(3, 2, 0.2, Math.PI / 4);
        addBranch(4, 2.2, 0.2, -Math.PI / 4);
        addBranch(5, 1.8, 0.15, Math.PI / 3);
        addBranch(5.5, 1.6, 0.15, -Math.PI / 3);
        
        // Main foliage canopy
        if (this.currentSeason !== 'winter') {
            const foliageGeometry = new THREE.SphereGeometry(3.5, 10, 10);
            const foliageMaterial = new THREE.MeshStandardMaterial(materials.broadleaf);
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = 8;
            foliage.castShadow = true;
            tree.add(foliage);
        }
        
        return tree;
    }
    
    createDetailedPine() {
        const tree = new THREE.Group();
        const materials = this.seasonalTreeMaterials[this.currentSeason];
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.5, 8, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Foliage - multiple cones with offset
        const layerCount = 6;
        const baseSize = 4;
        const step = 1.5;
        
        for (let i = 0; i < layerCount; i++) {
            const y = 3 + i * step;
            const size = baseSize - (i * 0.5);
            
            const foliageGeometry = new THREE.ConeGeometry(size, 1.5, 8);
            const foliageMaterial = new THREE.MeshStandardMaterial(materials.conifer);
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = y;
            foliage.castShadow = true;
            tree.add(foliage);
        }
        
        return tree;
    }
    
    createLowPolyTree() {
        const tree = new THREE.Group();
        const materials = this.seasonalTreeMaterials[this.currentSeason];
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 4, 5);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Foliage - low-poly cone
        const foliageGeometry = new THREE.ConeGeometry(3, 7, 4);
        const foliageMaterial = new THREE.MeshStandardMaterial(materials.lowpoly);
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 6.5;
        foliage.castShadow = true;
        tree.add(foliage);
        
        return tree;
    }
    
    createBlossomTree() {
        const tree = new THREE.Group();
        const materials = this.seasonalTreeMaterials[this.currentSeason];
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.7, 5, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Add branches
        const addBranch = (startY, length, thickness, angle, zRotation) => {
            const branchGeometry = new THREE.CylinderGeometry(thickness * 0.6, thickness, length, 5);
            branchGeometry.translate(0, length / 2, 0);
            branchGeometry.rotateZ(angle);
            
            const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
            branch.position.y = startY;
            branch.rotation.y = zRotation;
            branch.castShadow = true;
            tree.add(branch);
        };
        
        // Add multiple branches
        addBranch(3, 2.5, 0.25, Math.PI / 3, 0);
        addBranch(3.5, 2.2, 0.2, Math.PI / 4, Math.PI / 2);
        addBranch(4, 2, 0.2, Math.PI / 3.5, Math.PI);
        addBranch(4.5, 1.8, 0.15, Math.PI / 4, Math.PI * 1.5);
        
        // Foliage based on season
        if (this.currentSeason === 'spring') {
            // Blossom clusters
            const createBlossom = (x, y, z, size) => {
                const blossomGeometry = new THREE.SphereGeometry(size, 8, 8);
                const blossomMaterial = new THREE.MeshStandardMaterial({
                    color: 0xfce4ec,
                    roughness: 0.8,
                    metalness: 0.05
                });
                
                const blossom = new THREE.Mesh(blossomGeometry, blossomMaterial);
                blossom.position.set(x, y, z);
                blossom.castShadow = true;
                tree.add(blossom);
            };
            
            // Create blossom clusters
            for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 2 + Math.random() * 1.5;
                const height = 5 + Math.random() * 3;
                
                createBlossom(
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius,
                    0.5 + Math.random() * 0.3
                );
            }
        } else if (this.currentSeason === 'summer' || this.currentSeason === 'autumn') {
            // Full foliage
            const foliageColor = this.currentSeason === 'summer' 
                ? 0x66bb6a 
                : 0xff7043;
            
            const foliageGeometry = new THREE.SphereGeometry(3, 8, 8);
            const foliageMaterial = new THREE.MeshStandardMaterial({
                color: foliageColor,
                roughness: 0.8,
                metalness: 0.05
            });
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = 7;
            foliage.castShadow = true;
            tree.add(foliage);
            
            // Add some smaller clusters
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 3 + Math.random();
                const height = 6 + Math.random() * 2;
                
                const cluster = new THREE.Mesh(
                    new THREE.SphereGeometry(1 + Math.random(), 6, 6),
                    foliageMaterial
                );
                
                cluster.position.set(
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius
                );
                
                cluster.castShadow = true;
                tree.add(cluster);
            }
        }
        // No foliage for winter
        
        return tree;
    }
    
    createMapleTree() {
        const tree = new THREE.Group();
        const materials = this.seasonalTreeMaterials[this.currentSeason];
        
        // Trunk with natural curve
        const points = [];
        for (let i = 0; i <= 8; i++) {
            const y = i * 0.8;
            const xOffset = i > 2 ? 0.2 * Math.sin((i - 2) / 6 * Math.PI) : 0;
            points.push(new THREE.Vector3(xOffset, y, 0));
        }
        
        const trunkGeometry = new THREE.LatheGeometry(
            points, 
            8,           // Segments around
            0,           // Start angle
            Math.PI * 2  // End angle
        );
        
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Foliage - especially beautiful in autumn
        if (this.currentSeason !== 'winter') {
            let foliageColor;
            
            if (this.currentSeason === 'autumn') {
                foliageColor = 0xd84315; // Deep orange/red for maple in autumn
            } else if (this.currentSeason === 'spring') {
                foliageColor = 0x81c784; // Light green for spring
            } else {
                foliageColor = 0x2e7d32; // Deep green for summer
            }
            
            const foliageGeometry = new THREE.SphereGeometry(4, 10, 10);
            const foliageMaterial = new THREE.MeshStandardMaterial({
                color: foliageColor,
                roughness: 0.8,
                metalness: 0.05
            });
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = 7;
            foliage.scale.set(1, 0.8, 1); // Slightly flattened sphere
            foliage.castShadow = true;
            tree.add(foliage);
            
            // Add clusters to create more maple-like shape
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const radius = 2.5;
                
                const cluster = new THREE.Mesh(
                    new THREE.SphereGeometry(1.5 + Math.random() * 0.5, 6, 6),
                    foliageMaterial
                );
                
                cluster.position.set(
                    Math.cos(angle) * radius,
                    7 + (Math.random() - 0.5) * 2,
                    Math.sin(angle) * radius
                );
                
                cluster.castShadow = true;
                tree.add(cluster);
            }
        }
        
        return tree;
    }
    
    createWillowTree() {
        const tree = new THREE.Group();
        const materials = this.seasonalTreeMaterials[this.currentSeason];
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.6, 0.8, 8, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Drooping branches for willow
        const branchCount = this.currentSeason === 'winter' ? 15 : 30;
        const branchesGroup = new THREE.Group();
        branchesGroup.position.y = 7;
        
        for (let i = 0; i < branchCount; i++) {
            const angle = (i / branchCount) * Math.PI * 2;
            
            // Create drooping branch curve
            const curve = new THREE.CubicBezierCurve3(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(
                    Math.cos(angle) * 2,
                    -1,
                    Math.sin(angle) * 2
                ),
                new THREE.Vector3(
                    Math.cos(angle) * 4,
                    -4,
                    Math.sin(angle) * 4
                ),
                new THREE.Vector3(
                    Math.cos(angle) * 5,
                    -7,
                    Math.sin(angle) * 5
                )
            );
            
            const points = curve.getPoints(10);
            const branchGeometry = new THREE.BufferGeometry().setFromPoints(points);
            
            // Branch color based on season
            let branchColor;
            if (this.currentSeason === 'winter') {
                branchColor = 0x795548; // Brown in winter
            } else if (this.currentSeason === 'autumn') {
                branchColor = 0xffa726; // Orange/yellow in autumn
            } else {
                branchColor = 0x7cb342; // Green in spring/summer
            }
            
            const branchMaterial = new THREE.LineBasicMaterial({ 
                color: branchColor,
                linewidth: 1
            });
            
            const branch = new THREE.Line(branchGeometry, branchMaterial);
            branchesGroup.add(branch);
            
            // Add leaf clusters in non-winter seasons
            if (this.currentSeason !== 'winter') {
                const leafClusterCount = 3;
                for (let j = 0; j < leafClusterCount; j++) {
                    const t = (j + 1) / (leafClusterCount + 1); // Position along branch
                    const pos = curve.getPointAt(t);
                    
                    const leafGeometry = new THREE.SphereGeometry(0.3, 4, 4);
                    const leafMaterial = new THREE.MeshStandardMaterial({
                        color: this.currentSeason === 'autumn' ? 0xffcc80 : 0x7cb342,
                        roughness: 0.8,
                        metalness: 0.05
                    });
                    
                    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                    leaf.position.copy(pos);
                    leaf.scale.y = 0.5; // Flatten slightly
                    leaf.castShadow = true;
                    branchesGroup.add(leaf);
                }
            }
        }
        
        tree.add(branchesGroup);
        
        return tree;
    }
    
    createParticleSystems() {
        // Create particle systems for seasonal effects
        this.createButterflies();
        this.createLeaves();
        this.createSnow();
        
        // Show/hide based on season
        this.updateParticlesForSeason();
    }
    
    createButterflies() {
        // Create butterfly particles - only visible in spring and summer
        const butterflyCount = 30;
        const butterflyGeometry = new THREE.BufferGeometry();
        
        // Create wing-like shape
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const butterflyColors = [
            new THREE.Color(0xec407a), // Pink
            new THREE.Color(0x7e57c2), // Purple
            new THREE.Color(0x42a5f5), // Blue
            new THREE.Color(0xffeb3b), // Yellow
            new THREE.Color(0xff7043)  // Orange
        ];
        
        for (let i = 0; i < butterflyCount; i++) {
            // Random position within a large area
            const x = (Math.random() - 0.5) * 500;
            const y = 5 + Math.random() * 20;
            const z = (Math.random() - 0.5) * 500;
            
            positions.push(x, y, z);
            
            // Random color
            const color = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
            colors.push(color.r, color.g, color.b);
            
            // Random size
            sizes.push(1 + Math.random() * 2);
        }
        
        butterflyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        butterflyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        butterflyGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // Create a basic butterfly texture
        const butterflyTexture = this.createButterflyTexture();
        
        // Butterfly sprite
        const butterflyMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            map: butterflyTexture,
            transparent: true,
            alphaTest: 0.5
        });
        
        this.butterflyParticles = new THREE.Points(butterflyGeometry, butterflyMaterial);
        // Store original positions for animation
        this.butterfliesData = [];
        
        for (let i = 0; i < butterflyCount; i++) {
            this.butterfliesData.push({
                originalX: positions[i * 3],
                originalY: positions[i * 3 + 1],
                originalZ: positions[i * 3 + 2],
                speed: 0.2 + Math.random() * 0.3,
                flutterSpeed: 3 + Math.random() * 5,
                phase: Math.random() * Math.PI * 2
            });
        }
        
        this.scene.add(this.butterflyParticles);
    }
    
    createButterflyTexture() {
        // Create a canvas for the butterfly texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        
        // Clear canvas
        context.fillStyle = 'rgba(0,0,0,0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw butterfly wings
        context.fillStyle = 'rgba(255,255,255,1)';
        
        // Left wing
        context.beginPath();
        context.ellipse(8, 16, 8, 12, Math.PI / 4, 0, Math.PI * 2);
        context.fill();
        
        // Right wing
        context.beginPath();
        context.ellipse(24, 16, 8, 12, -Math.PI / 4, 0, Math.PI * 2);
        context.fill();
        
        // Create texture
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    createLeaves() {
        // Create falling leaves - only visible in autumn
        const leafCount = 100;
        const leafGeometry = new THREE.BufferGeometry();
        
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const leafColors = [
            new THREE.Color(0xff5722), // Deep Orange
            new THREE.Color(0xff7043), // Light Orange
            new THREE.Color(0xffb74d), // Amber
            new THREE.Color(0xe65100), // Dark Orange
            new THREE.Color(0xd84315)  // Brown-Orange
        ];
        
        for (let i = 0; i < leafCount; i++) {
            // Random position within a large area
            const x = (Math.random() - 0.5) * 500;
            const y = 5 + Math.random() * 50;
            const z = (Math.random() - 0.5) * 500;
            
            positions.push(x, y, z);
            
            // Random color
            const color = leafColors[Math.floor(Math.random() * leafColors.length)];
            colors.push(color.r, color.g, color.b);
            
            // Random size
            sizes.push(0.5 + Math.random() * 1.5);
        }
        
        leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        leafGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        leafGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // Create a basic leaf texture
        const leafTexture = this.createLeafTexture();
        
        // Leaf sprite
        const leafMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            map: leafTexture,
            transparent: true,
            alphaTest: 0.5
        });
        
        this.leafParticles = new THREE.Points(leafGeometry, leafMaterial);
        // Store original positions for animation
        this.leavesData = [];
        
        for (let i = 0; i < leafCount; i++) {
            this.leavesData.push({
                originalX: positions[i * 3],
                originalY: positions[i * 3 + 1],
                originalZ: positions[i * 3 + 2],
                fallSpeed: 0.05 + Math.random() * 0.1,
                swaySpeed: 0.5 + Math.random() * 1,
                phase: Math.random() * Math.PI * 2
            });
        }
        
        this.scene.add(this.leafParticles);
    }
    
    createLeafTexture() {
        // Create a canvas for the leaf texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        
        // Clear canvas
        context.fillStyle = 'rgba(0,0,0,0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw a simple leaf shape
        context.fillStyle = 'rgba(255,255,255,1)';
        context.beginPath();
        context.moveTo(16, 2);
        context.bezierCurveTo(25, 8, 30, 16, 16, 30);
        context.bezierCurveTo(2, 16, 7, 8, 16, 2);
        context.fill();
        
        // Draw a stem
        context.fillStyle = 'rgba(180,180,180,1)';
        context.fillRect(15, 25, 2, 5);
        
        // Create texture
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    createSnow() {
        // Create snow particles - only visible in winter
        const snowCount = 500;
        const snowGeometry = new THREE.BufferGeometry();
        
        const positions = [];
        const sizes = [];
        
        for (let i = 0; i < snowCount; i++) {
            // Random position within a large area
            const x = (Math.random() - 0.5) * 800;
            const y = 5 + Math.random() * 100;
            const z = (Math.random() - 0.5) * 800;
            
            positions.push(x, y, z);
            
            // Random size
            sizes.push(0.3 + Math.random() * 0.7);
        }
        
        snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        snowGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // Create a snow flake texture
        const snowTexture = this.createSnowflakeTexture();
        
        // Snow sprite
        const snowMaterial = new THREE.PointsMaterial({
            size: 1.5,
            map: snowTexture,
            transparent: true,
            opacity: 0.8,
            color: 0xffffff
        });
        
        this.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
        // Store original positions for animation
        this.snowData = [];
        
        for (let i = 0; i < snowCount; i++) {
            this.snowData.push({
                originalX: positions[i * 3],
                originalY: positions[i * 3 + 1],
                originalZ: positions[i * 3 + 2],
                fallSpeed: 0.02 + Math.random() * 0.08,
                swaySpeed: 0.2 + Math.random() * 0.5,
                swaySeverity: 0.2 + Math.random() * 0.8,
                phase: Math.random() * Math.PI * 2
            });
        }
        
        this.scene.add(this.snowParticles);
    }
    
    createSnowflakeTexture() {
        // Create a canvas for the snowflake texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        
        // Clear canvas
        context.fillStyle = 'rgba(0,0,0,0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw a simple snowflake
        context.fillStyle = 'rgba(255,255,255,1)';
        
        // Draw circle
        context.beginPath();
        context.arc(16, 16, 5, 0, Math.PI * 2);
        context.fill();
        
        // Draw spikes
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x1 = 16 + Math.cos(angle) * 5;
            const y1 = 16 + Math.sin(angle) * 5;
            const x2 = 16 + Math.cos(angle) * 10;
            const y2 = 16 + Math.sin(angle) * 10;
            
            context.beginPath();
            context.moveTo(x1, y1);
            context.lineTo(x2, y2);
            context.lineWidth = 2;
            context.strokeStyle = 'rgba(255,255,255,1)';
            context.stroke();
        }
        
        // Create texture
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    updateParticlesForSeason() {
        // Show/hide particles based on season
        if (this.butterflyParticles) {
            this.butterflyParticles.visible = (this.currentSeason === 'spring' || this.currentSeason === 'summer');
        }
        
        if (this.leafParticles) {
            this.leafParticles.visible = (this.currentSeason === 'autumn');
        }
        
        if (this.snowParticles) {
            this.snowParticles.visible = (this.currentSeason === 'winter');
        }
    }
    
    setSeason(season) {
        if (this.currentSeason === season) return;
        
        this.currentSeason = season;
        
        // Update UI
        document.querySelectorAll('.season-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-season="${season}"]`).classList.add('active');
        
        // Update terrain
        this.updateTerrainForSeason();
        
        // Regenerate trees with new seasonal appearance
        this.createTreeTemplates();
        this.generateTrees();
        
        // Update particles
        this.updateParticlesForSeason();
    }
    
    updateTerrainForSeason() {
        // Update ground material
        if (this.ground) {
            this.updateGroundForSeason(this.ground.material);
        }
        
        // Update chapter platforms based on season
        const chapterColors = {
            spring: { primary: 0x9ccc65, secondary: 0x7cb342 },
            summer: { primary: 0x8bc34a, secondary: 0x689f38 },
            autumn: { primary: 0xe57373, secondary: 0xef6c00 },
            winter: { primary: 0xe0f7fa, secondary: 0xb3e5fc }
        };
        
        const colors = chapterColors[this.currentSeason];
        
        this.chapters.forEach(chapter => {
            if (chapter.platform) {
                chapter.platform.material.color.setHex(
                    chapter.id === 1 ? colors.primary : colors.secondary
                );
            }
        });
        
        // Update or recreate grass based on season
        if (this.grass) {
            this.grass.forEach(grass => {
                this.scene.remove(grass);
            });
            this.grass = [];
        }
        
        if (this.flowers) {
            this.flowers.forEach(flower => {
                this.scene.remove(flower);
            });
            this.flowers = [];
        }
        
        if (this.butterflies) {
            this.butterflies.forEach(butterfly => {
                this.scene.remove(butterfly);
            });
            this.butterflies = [];
        }
        
        if (this.birds) {
            this.birds.forEach(bird => {
                this.scene.remove(bird);
            });
            this.birds = [];
        }
        
        // Regenerate seasonal elements
        if (this.currentSeason === 'spring' || this.currentSeason === 'summer') {
            this.createGrass();
            this.createFlowers();
            this.createWildlife();
        }
        
        // Update lake color for the season
        if (this.lake) {
            const lakeColors = {
                spring: 0x4fc3f7, // Bright blue
                summer: 0x039be5, // Deep blue
                autumn: 0x0277bd, // Dark blue
                winter: 0x90caf9  // Light icy blue
            };
            
            this.lake.material.color.setHex(lakeColors[this.currentSeason]);
        }
    }
    
    initUI() {
        // Get UI elements
        this.followerSlider = document.getElementById('follower-slider');
        this.followerCounter = document.getElementById('follower-counter');
        this.newFollowerInput = document.getElementById('new-follower');
        this.inputValidation = document.getElementById('input-validation');
        this.addFollowerBtn = document.getElementById('add-follower-btn');
        this.viewFollowersBtn = document.getElementById('view-followers-btn');
        this.resetViewBtn = document.getElementById('reset-view-btn');
        this.followersPanel = document.getElementById('followers-panel');
        this.followersList = document.getElementById('followers-list');
        this.followerSearch = document.getElementById('follower-search');
        this.followerSort = document.getElementById('follower-sort');
        this.tooltip = document.getElementById('tooltip');
        this.controlPanel = document.getElementById('control-panel');
        this.togglePanelBtn = document.getElementById('toggle-panel-btn');
        this.panelToggleIcon = document.getElementById('panel-toggle-icon');
        this.progressFill = document.getElementById('chapter-progress-fill');
        this.currentFollowers = document.getElementById('current-followers');
        this.maxFollowers = document.getElementById('max-followers');
        this.followersCount = document.getElementById('followers-count');
        
        // Time of day buttons
        this.dayBtn = document.getElementById('day-btn');
        this.sunsetBtn = document.getElementById('sunset-btn');
        this.nightBtn = document.getElementById('night-btn');
        
        // Season buttons
        this.springBtn = document.getElementById('spring-btn');
        this.summerBtn = document.getElementById('summer-btn');
        this.autumnBtn = document.getElementById('autumn-btn');
        this.winterBtn = document.getElementById('winter-btn');
        
        // Terrain buttons
        this.normalTerrainBtn = document.getElementById('normal-terrain-btn');
        this.hillsTerrainBtn = document.getElementById('hills-terrain-btn');
        this.valleysTerrainBtn = document.getElementById('valleys-terrain-btn');
        
        // View mode buttons
        this.firstPersonBtn = document.getElementById('first-person-btn');
        this.orbitBtn = document.getElementById('orbit-btn');
        this.topViewBtn = document.getElementById('top-view-btn');
        
        // Screenshot button
        this.screenshotBtn = document.getElementById('screenshot-btn');
        this.screenshotModal = document.getElementById('screenshot-modal');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.downloadScreenshotBtn = document.getElementById('download-screenshot-btn');
        this.shareScreenshotBtn = document.getElementById('share-screenshot-btn');
        
        // Import/Export buttons
        this.exportBtn = document.getElementById('export-btn');
        this.importBtn = document.getElementById('import-btn');
        this.importFile = document.getElementById('import-file');
        
        // Close followers panel button
        this.closeFollowersBtn = document.getElementById('close-followers-btn');
        
        // Tab selectors
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Setup event listeners
        this.followerSlider.addEventListener('input', this.updateFollowerCount.bind(this));
        this.newFollowerInput.addEventListener('input', this.validateFollowerInput.bind(this));
        this.addFollowerBtn.addEventListener('click', this.addNewFollower.bind(this));
        this.newFollowerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addNewFollower();
            }
        });
        this.viewFollowersBtn.addEventListener('click', this.toggleFollowersPanel.bind(this));
        this.closeFollowersBtn.addEventListener('click', this.toggleFollowersPanel.bind(this));
        this.resetViewBtn.addEventListener('click', this.resetCamera.bind(this));
        
        // Follower search and sort
        this.followerSearch.addEventListener('input', this.filterFollowers.bind(this));
        this.followerSort.addEventListener('change', this.sortFollowers.bind(this));
        
        // Toggle panel
        this.togglePanelBtn.addEventListener('click', this.toggleControlPanel.bind(this));
        
        // Time of day buttons
        this.dayBtn.addEventListener('click', () => this.setTimeOfDay('day'));
        this.sunsetBtn.addEventListener('click', () => this.setTimeOfDay('sunset'));
        this.nightBtn.addEventListener('click', () => this.setTimeOfDay('night'));
        
        // Season buttons
        this.springBtn.addEventListener('click', () => this.setSeason('spring'));
        this.summerBtn.addEventListener('click', () => this.setSeason('summer'));
        this.autumnBtn.addEventListener('click', () => this.setSeason('autumn'));
        this.winterBtn.addEventListener('click', () => this.setSeason('winter'));
        
        // Terrain buttons
        this.normalTerrainBtn.addEventListener('click', () => this.updateTerrainType('normal'));
        this.hillsTerrainBtn.addEventListener('click', () => this.updateTerrainType('hills'));
        this.valleysTerrainBtn.addEventListener('click', () => this.updateTerrainType('valleys'));
        
        // View mode buttons
        this.firstPersonBtn.addEventListener('click', this.enableFirstPersonMode.bind(this));
        this.orbitBtn.addEventListener('click', this.enableOrbitMode.bind(this));
        this.topViewBtn.addEventListener('click', this.enableTopView.bind(this));
        
        // Screenshot functionality
        this.screenshotBtn.addEventListener('click', this.takeScreenshot.bind(this));
        this.closeModalBtn.addEventListener('click', this.closeScreenshotModal.bind(this));
        this.downloadScreenshotBtn.addEventListener('click', this.downloadScreenshot.bind(this));
        this.shareScreenshotBtn.addEventListener('click', this.shareScreenshot.bind(this));
        
        // Import/Export functionality
        this.exportBtn.addEventListener('click', this.exportFollowerData.bind(this));
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', this.importFollowerData.bind(this));
        
        // Tab functionality
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Update active tab button
                this.tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab content
                this.tabContents.forEach(content => {
                    content.classList.toggle('active', content.dataset.tab === tabName);
                });
            });
        });
    }
    
    validateFollowerInput() {
        const name = this.newFollowerInput.value.trim();
        
        if (name.length === 0) {
            this.inputValidation.classList.remove('error', 'success');
            this.inputValidation.style.display = 'none';
            this.addFollowerBtn.disabled = true;
            return;
        }
        
        // Check for duplicates
        const isDuplicate = this.followers.some(follower => follower.name.toLowerCase() === name.toLowerCase());
        
        if (isDuplicate) {
            this.inputValidation.textContent = 'This follower name already exists';
            this.inputValidation.classList.add('error');
            this.inputValidation.classList.remove('success');
            this.inputValidation.style.display = 'block';
            this.addFollowerBtn.disabled = true;
        } else if (name.length < 3) {
            this.inputValidation.textContent = 'Name must be at least 3 characters';
            this.inputValidation.classList.add('error');
            this.inputValidation.classList.remove('success');
            this.inputValidation.style.display = 'block';
            this.addFollowerBtn.disabled = true;
        } else {
            this.inputValidation.textContent = 'Valid name';
            this.inputValidation.classList.add('success');
            this.inputValidation.classList.remove('error');
            this.inputValidation.style.display = 'block';
            this.addFollowerBtn.disabled = false;
        }
    }
    
    toggleControlPanel() {
        this.isPanelVisible = !this.isPanelVisible;
        this.controlPanel.classList.toggle('hidden', !this.isPanelVisible);
        
        // Update toggle button icon
        if (this.isPanelVisible) {
            this.panelToggleIcon.className = 'fas fa-chevron-left';
        } else {
            this.panelToggleIcon.className = 'fas fa-chevron-right';
        }
    }
    
    takeScreenshot() {
        // Temporarily hide UI elements
        const uiElements = [
            this.controlPanel, 
            this.followersPanel,
            this.keyboardControls, 
            document.querySelector('.view-controls'),
            document.querySelector('.brand-header'),
            document.querySelector('.experience-bar'),
            this.screenshotBtn
        ];
        
        // Store visibility state
        const visibilityStates = uiElements.map(el => el.style.display);
        
        // Hide UI elements
        uiElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Wait for next frame to ensure UI is hidden
        requestAnimationFrame(() => {
            // Render scene
            this.renderer.render(this.scene, this.camera);
            
            // Take screenshot
            const screenshot = this.renderer.domElement.toDataURL('image/png');
            
            // Restore UI elements
            uiElements.forEach((el, i) => {
                if (el) el.style.display = visibilityStates[i];
            });
            
            // Display screenshot in modal
            const container = document.getElementById('screenshot-container');
            container.innerHTML = '';
            
            const img = document.createElement('img');
            img.src = screenshot;
            container.appendChild(img);
            
            // Store screenshot data for download
            this.currentScreenshot = screenshot;
            
            // Show modal
            this.screenshotModal.classList.add('active');
        });
    }
    
    closeScreenshotModal() {
        this.screenshotModal.classList.remove('active');
    }
    
    downloadScreenshot() {
        if (!this.currentScreenshot) return;
        
        // Create download link
        const link = document.createElement('a');
        link.href = this.currentScreenshot;
        link.download = `pura-forest-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    shareScreenshot() {
        if (!this.currentScreenshot || !navigator.share) return;
        
        // Convert base64 to blob
        fetch(this.currentScreenshot)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], 'pura-forest.png', { type: 'image/png' });
                
                navigator.share({
                    title: 'Pura Forest Screenshot',
                    text: 'Check out my Instagram followers forest!',
                    files: [file]
                }).catch(console.error);
            });
    }
    
    exportFollowerData() {
        // Create JSON data
        const data = {
            followers: this.followers,
            date: new Date().toISOString(),
            version: '1.0'
        };
        
        // Convert to JSON string
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pura-followers.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
    }
    
    importFollowerData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.followers && Array.isArray(data.followers)) {
                    // Clear existing followers
                    this.followers = [];
                    
                    // Add imported followers
                    data.followers.forEach(follower => {
                        this.followers.push({
                            name: follower.name,
                            date: follower.date
                        });
                    });
                    
                    // Update UI
                    this.followerSlider.value = this.followers.length;
                    this.followerCounter.textContent = this.followers.length;
                    
                    // Update trees and followers list
                    this.generateTrees();
                    this.updateFollowersList();
                    this.updateProgressBar();
                    
                    // Show success message
                    alert(`Successfully imported ${this.followers.length} followers!`);
                } else {
                    alert('Invalid data format');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Error importing data. Please check the file format.');
            }
            
            // Reset file input
            this.importFile.value = '';
        };
        
        reader.readAsText(file);
    }
    
    enableFirstPersonMode() {
        this.isFirstPersonMode = true;
        this.isOrbitMode = false;
        
        // Update UI
        document.querySelectorAll('.view-control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.firstPersonBtn.classList.add('active');
        
        // Position camera for first-person view
        const startPosition = new THREE.Vector3(0, 5, 80);
        
        gsap.to(this.camera.position, {
            x: startPosition.x,
            y: startPosition.y,
            z: startPosition.z,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.lookAt(0, 5, 0);
            }
        });
        
        // Show keyboard controls help
        this.keyboardControls.classList.add('visible');
        setTimeout(() => {
            this.keyboardControls.classList.remove('visible');
        }, 5000);
    }
    
    enableOrbitMode() {
        this.isFirstPersonMode = false;
        this.isOrbitMode = true;
        
        // Update UI
        document.querySelectorAll('.view-control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.orbitBtn.classList.add('active');
        
        // Reset camera to orbit position
        this.resetCamera();
    }
    
    enableTopView() {
        this.isFirstPersonMode = false;
        this.isOrbitMode = false;
        
        // Update UI
        document.querySelectorAll('.view-control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.topViewBtn.classList.add('active');
        
        // Position camera for top-down view
        gsap.to(this.camera.position, {
            x: 0,
            y: 300,
            z: 0,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.lookAt(0, 0, 0);
            }
        });
    }
    
    onMouseDown(event) {
        // Start orbit dragging
        if (!this.isFirstPersonMode && event.button === 0) {
            this.cameraControls.isDragging = true;
            this.cameraControls.lastMouseX = event.clientX;
            this.cameraControls.lastMouseY = event.clientY;
        }
    }
    
    onMouseUp(event) {
        // End orbit dragging
        this.cameraControls.isDragging = false;
    }
    
    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Handle camera rotation with mouse drag
        if (this.cameraControls.isDragging) {
            const deltaX = event.clientX - this.cameraControls.lastMouseX;
            const deltaY = event.clientY - this.cameraControls.lastMouseY;
            
            if (this.isOrbitMode) {
                // In orbit mode, rotate around target
                this.orbitAngle -= deltaX * this.cameraControls.mouseSensitivity;
                
                // Limit vertical angle
                const newHeight = this.orbitHeight - deltaY;
                this.orbitHeight = Math.max(10, Math.min(300, newHeight));
                
                // Update camera position
                this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
                this.camera.position.y = this.orbitHeight;
                this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
                this.camera.lookAt(this.targetPosition);
            } else if (this.isFirstPersonMode) {
                // In first person mode, rotate the camera
                const eulerY = -deltaX * this.cameraControls.mouseSensitivity;
                const eulerX = -deltaY * this.cameraControls.mouseSensitivity;
                
                this.camera.rotation.y += eulerY;
                
                // Limit pitch
                const newPitch = this.camera.rotation.x + eulerX;
                const MAX_PITCH = Math.PI / 2 - 0.1;
                this.camera.rotation.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, newPitch));
            }
            
            this.cameraControls.lastMouseX = event.clientX;
            this.cameraControls.lastMouseY = event.clientY;
        }
        
        this.checkTreeHover(event.clientX, event.clientY);
    }
    
    onMouseWheel(event) {
        // Handle zoom with mouse wheel
        if (this.isOrbitMode) {
            // Zoom in/out by changing orbit radius
            const delta = Math.sign(event.deltaY) * 10;
            this.orbitRadius = Math.max(50, Math.min(500, this.orbitRadius + delta));
            
            // Update camera position
            this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
            this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
            this.camera.lookAt(this.targetPosition);
        }
    }
    
    onKeyDown(event) {
        // Handle keyboard movement
        const key = event.key.toLowerCase();
        
        if (key === 'w' || key === 'arrowup') {
            this.cameraControls.moveForward = true;
        } else if (key === 's' || key === 'arrowdown') {
            this.cameraControls.moveBackward = true;
        } else if (key === 'a' || key === 'arrowleft') {
            this.cameraControls.moveLeft = true;
        } else if (key === 'd' || key === 'arrowright') {
            this.cameraControls.moveRight = true;
        } else if (key === 'h') {
            // Toggle UI visibility
            this.isUIVisible = !this.isUIVisible;
            
            // Toggle UI elements
            const uiElements = [
                this.controlPanel,
                document.querySelector('.brand-header'),
                document.querySelector('.experience-bar'),
                document.querySelector('.view-controls'),
                this.screenshotBtn
            ];
            
            uiElements.forEach(el => {
                if (el) {
                    if (this.isUIVisible) {
                        el.style.opacity = '1';
                        el.style.pointerEvents = 'auto';
                    } else {
                        el.style.opacity = '0';
                        el.style.pointerEvents = 'none';
                    }
                }
            });
        }
    }
    
    onKeyUp(event) {
        // Handle keyboard movement
        const key = event.key.toLowerCase();
        
        if (key === 'w' || key === 'arrowup') {
            this.cameraControls.moveForward = false;
        } else if (key === 's' || key === 'arrowdown') {
            this.cameraControls.moveBackward = false;
        } else if (key === 'a' || key === 'arrowleft') {
            this.cameraControls.moveLeft = false;
        } else if (key === 'd' || key === 'arrowright') {
            this.cameraControls.moveRight = false;
        }
    }
    
    onTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Single touch for hover
            const touch = event.touches[0];
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            this.checkTreeHover(touch.clientX, touch.clientY);
            
            // Start orbit dragging
            this.cameraControls.isDragging = true;
            this.cameraControls.lastMouseX = touch.clientX;
            this.cameraControls.lastMouseY = touch.clientY;
        } else if (event.touches.length === 2) {
            // Pinch to zoom
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            this.pinchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.cameraControls.isDragging) {
            // Single touch for dragging and hover
            const touch = event.touches[0];
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            
            // Handle camera rotation with touch drag
            const deltaX = touch.clientX - this.cameraControls.lastMouseX;
            const deltaY = touch.clientY - this.cameraControls.lastMouseY;
            
            if (this.isOrbitMode) {
                // In orbit mode, rotate around target
                this.orbitAngle -= deltaX * this.cameraControls.touchSensitivity;
                
                // Limit vertical angle
                const newHeight = this.orbitHeight - deltaY;
                this.orbitHeight = Math.max(10, Math.min(300, newHeight));
                
                // Update camera position
                this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
                this.camera.position.y = this.orbitHeight;
                this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
                this.camera.lookAt(this.targetPosition);
            } else if (this.isFirstPersonMode) {
                // In first person mode, rotate the camera
                const eulerY = -deltaX * this.cameraControls.touchSensitivity;
                const eulerX = -deltaY * this.cameraControls.touchSensitivity;
                
                this.camera.rotation.y += eulerY;
                
                // Limit pitch
                const newPitch = this.camera.rotation.x + eulerX;
                const MAX_PITCH = Math.PI / 2 - 0.1;
                this.camera.rotation.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, newPitch));
            }
            
            this.cameraControls.lastMouseX = touch.clientX;
            this.cameraControls.lastMouseY = touch.clientY;
            
            this.checkTreeHover(touch.clientX, touch.clientY);
        } else if (event.touches.length === 2) {
            // Pinch to zoom
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const newPinchDistance = Math.sqrt(dx * dx + dy * dy);
            
            if (this.isOrbitMode) {
                // Zoom in/out by changing orbit radius
                const pinchDelta = this.pinchDistance - newPinchDistance;
                this.orbitRadius = Math.max(50, Math.min(500, this.orbitRadius + pinchDelta * 0.5));
                
                // Update camera position
                this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
                this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
                this.camera.lookAt(this.targetPosition);
            }
            
            this.pinchDistance = newPinchDistance;
        }
    }
    
    onTouchEnd(event) {
        // End dragging
        this.cameraControls.isDragging = false;
    }
    
    checkTreeHover(clientX, clientY) {
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get objects intersecting the ray
        const intersects = this.raycaster.intersectObjects(
            this.scene.children, 
            true
        );
        
        // Find if we hit a tree
        let hitTree = null;
        
        if (intersects.length > 0) {
            // Find the first tree in the intersected objects
            for (let i = 0; i < intersects.length; i++) {
                // Find parent object that is a tree
                let parent = intersects[i].object;
                while (parent.parent && parent.parent !== this.scene) {
                    parent = parent.parent;
                }
                
                // Check if this is one of our trees
                for (const tree of this.trees) {
                    if (tree.mesh === parent) {
                        hitTree = tree;
                        break;
                    }
                }
                
                if (hitTree) break;
            }
        }
        
        // Handle hover state
        if (hitTree) {
            // Get follower data
            const follower = this.followers[hitTree.followerIndex];
            
            // Update tooltip
            this.tooltip.innerHTML = `
                <div class="tooltip-name">${follower.name}</div>
                <div class="tooltip-date">Joined: ${follower.date}</div>
            `;
            
            // Position tooltip
            this.tooltip.style.left = (clientX + 15) + 'px';
            this.tooltip.style.top = (clientY - 20) + 'px';
            this.tooltip.style.display = 'block';
            this.tooltip.classList.add('visible');
            
            // Highlight tree
            if (this.hoveredTree && this.hoveredTree !== hitTree) {
                // Reset previous hovered tree
                gsap.to(this.hoveredTree.mesh.scale, {
                    x: this.hoveredTree.originalScale.x,
                    y: this.hoveredTree.originalScale.y,
                    z: this.hoveredTree.originalScale.z,
                    duration: 0.3
                });
            }
            
            // Store reference and original scale
            if (this.hoveredTree !== hitTree) {
                hitTree.originalScale = hitTree.mesh.scale.clone();
                
                // Scale up tree slightly for hover effect
                gsap.to(hitTree.mesh.scale, {
                    x: hitTree.originalScale.x * 1.2,
                    y: hitTree.originalScale.y * 1.2,
                    z: hitTree.originalScale.z * 1.2,
                    duration: 0.3
                });
                
                this.hoveredTree = hitTree;
            }
        } else {
            // Hide tooltip
            this.tooltip.classList.remove('visible');
            setTimeout(() => {
                if (!this.tooltip.classList.contains('visible')) {
                    this.tooltip.style.display = 'none';
                }
            }, 300);
            
            // Reset hovered tree
            if (this.hoveredTree) {
                gsap.to(this.hoveredTree.mesh.scale, {
                    x: this.hoveredTree.originalScale.x,
                    y: this.hoveredTree.originalScale.y,
                    z: this.hoveredTree.originalScale.z,
                    duration: 0.3
                });
                
                this.hoveredTree = null;
            }
        }
    }
    
    setupSampleData() {
        // Generate initial sample followers
        this.generateSampleFollowers(50);
        
        // Update UI to reflect current count
        this.followerSlider.value = this.followers.length;
        this.followerCounter.textContent = this.followers.length;
        
        // Generate trees for initial followers
        this.generateTrees();
        
        // Update followers list and progress bar
        this.updateFollowersList();
        this.updateProgressBar();
    }
    
    generateSampleFollowers(count) {
        const firstNames = [
            "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", 
            "Isabella", "Jacob", "Mia", "Lucas", "Charlotte", "Alexander", "Amelia", 
            "Benjamin", "Harper", "William", "Evelyn", "James", "Abigail", "Elijah", 
            "Emily", "Oliver", "Elizabeth", "Daniel", "Sofia", "Matthew", "Avery", "Jackson",
            "Aria", "David", "Zoe", "Joseph", "Camila", "Carter", "Penelope", "Owen",
            "Riley", "Henry", "Layla", "Wyatt", "Nora", "John", "Lily", "Luke", "Eleanor",
            "Gabriel", "Hannah"
        ];
        
        const lastNames = [
            "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson",
            "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
            "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
            "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill",
            "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell",
            "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards"
        ];
        
        for (let i = 0; i < count; i++) {
            const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            
            // Generate a random date within the last 6 months
            const randomDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
            
            this.followers.push({
                name: `${randomFirstName} ${randomLastName}`,
                date: randomDate.toISOString().slice(0, 10)
            });
        }
    }
    
    updateFollowerCount() {
        const count = parseInt(this.followerSlider.value);
        this.followerCounter.textContent = count;
        
        // Update followers array
        if (count > this.followers.length) {
            this.generateSampleFollowers(count - this.followers.length);
        } else if (count < this.followers.length) {
            this.followers = this.followers.slice(0, count);
        }
        
        // Update trees and UI
        this.generateTrees();
        this.updateFollowersList();
        this.updateProgressBar();
    }
    
    addNewFollower() {
        const name = this.newFollowerInput.value.trim();
        
        if (name && name.length >= 3 && !this.followers.some(f => f.name.toLowerCase() === name.toLowerCase())) {
            this.followers.push({
                name: name,
                date: new Date().toISOString().slice(0, 10)
            });
            
            // Update UI
            this.followerSlider.value = this.followers.length;
            this.followerCounter.textContent = this.followers.length;
            this.newFollowerInput.value = '';
            this.inputValidation.style.display = 'none';
            
            // Update trees and followers list
            this.generateTrees();
            this.updateFollowersList();
            this.updateProgressBar();
            
            // Animate the new tree
            if (this.trees.length > 0) {
                const newTree = this.trees[this.trees.length - 1];
                this.animateNewTree(newTree);
            }
        } else {
            // Display validation message
            this.validateFollowerInput();
        }
    }
    
    removeFollower(index) {
        // Confirm deletion
        if (confirm(`Are you sure you want to remove ${this.followers[index].name}?`)) {
            // Find the tree associated with this follower
            const treeToRemove = this.trees.find(tree => tree.followerIndex === index);
            
            if (treeToRemove) {
                // Animate tree removal
                gsap.to(treeToRemove.mesh.scale, {
                    x: 0,
                    y: 0,
                    z: 0,
                    duration: 0.5,
                    ease: "power2.in",
                    onComplete: () => {
                        // Remove tree from scene
                        this.scene.remove(treeToRemove.mesh);
                        
                        // Remove follower and update arrays
                        this.followers.splice(index, 1);
                        
                        // Update UI
                        this.followerSlider.value = this.followers.length;
                        this.followerCounter.textContent = this.followers.length;
                        
                        // Regenerate trees with updated indices
                        this.generateTrees();
                        this.updateFollowersList();
                        this.updateProgressBar();
                    }
                });
            }
        }
    }
    
    animateNewTree(tree) {
        // Store original scale
        const originalScale = tree.mesh.scale.clone();
        
        // Start with zero scale
        tree.mesh.scale.set(0, 0, 0);
        
        // Add a glow effect
        const glowGeometry = new THREE.SphereGeometry(5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00CA99,
            transparent: true,
            opacity: 0.5
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(tree.mesh.position);
        glow.position.y = 5;
        glow.scale.set(0, 0, 0);
        this.scene.add(glow);
        
        // Animate the glow
        gsap.to(glow.scale, {
            x: 2,
            y: 2,
            z: 2,
            duration: 0.5,
            ease: "power2.out",
            onComplete: () => {
                // Animate the tree growing
                gsap.to(tree.mesh.scale, {
                    x: originalScale.x,
                    y: originalScale.y,
                    z: originalScale.z,
                    duration: 1,
                    ease: "elastic.out(1, 0.5)"
                });
                
                // Fade out glow
                gsap.to(glow.material, {
                    opacity: 0,
                    duration: 1,
                    ease: "power2.out",
                    onComplete: () => {
                        this.scene.remove(glow);
                    }
                });
            }
        });
        
        // Add particle burst effect
        this.createTreeGrowthParticles(tree.mesh.position.x, tree.mesh.position.y, tree.mesh.position.z);
    }
    
    createTreeGrowthParticles(x, y, z) {
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const color1 = new THREE.Color(0x00CA99); // Brand green
        const color2 = new THREE.Color(0x7EEFD5); // Brand light green
        
        for (let i = 0; i < particleCount; i++) {
            // Initial position at tree base
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // Random color between two brand colors
            const mixFactor = Math.random();
            const particleColor = new THREE.Color().lerpColors(color1, color2, mixFactor);
            
            colors[i * 3] = particleColor.r;
            colors[i * 3 + 1] = particleColor.g;
            colors[i * 3 + 2] = particleColor.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.8,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // Animate particles outward
        const animateParticles = () => {
            const positions = particles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                // Random direction
                const angle = Math.random() * Math.PI * 2;
                const height = Math.random() * Math.PI;
                const radius = 0.2 + Math.random() * 0.3;
                
                positions[i * 3] += Math.sin(angle) * Math.cos(height) * radius;
                positions[i * 3 + 1] += Math.sin(height) * radius + 0.1;
                positions[i * 3 + 2] += Math.cos(angle) * Math.cos(height) * radius;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
        };
        
        // Run animation for a short time
        let time = 0;
        const particleAnimation = setInterval(() => {
            animateParticles();
            time += 16;
            
            // Fade out
            if (time > 500) {
                material.opacity -= 0.05;
                
                if (material.opacity <= 0) {
                    clearInterval(particleAnimation);
                    this.scene.remove(particles);
                }
            }
        }, 16);
    }
    
    updateProgressBar() {
        const totalFollowers = this.followers.length;
        const currentChapter = this.getCurrentChapter(totalFollowers);
        
        // Update chapter label
        document.querySelector('.chapter-label span:first-child').textContent = `Chapter ${currentChapter.id}`;
        
        // Update follower count
        this.currentFollowers.textContent = totalFollowers;
        this.maxFollowers.textContent = currentChapter.max;
        
        // Calculate progress percentage within current chapter
        const chapterProgress = (totalFollowers - currentChapter.min + 1) / 
                              (currentChapter.max - currentChapter.min + 1) * 100;
        
        // Animate the progress bar
        gsap.to(this.progressFill, {
            width: `${Math.min(100, chapterProgress)}%`,
            duration: 0.5,
            ease: "power1.out"
        });
    }
    
    getCurrentChapter(followerCount) {
        for (let i = this.chapters.length - 1; i >= 0; i--) {
            if (followerCount >= this.chapters[i].min) {
                return this.chapters[i];
            }
        }
        return this.chapters[0];
    }
    
    updateFollowersList() {
        this.followersList.innerHTML = '';
        
        // Sort followers based on selected option
        this.sortFollowers();
        
        // Filter followers based on search input
        this.filterFollowers();
    }
    
    filterFollowers() {
        const searchTerm = this.followerSearch ? this.followerSearch.value.trim().toLowerCase() : '';
        
        // Filter followers based on search term
        const filteredFollowers = searchTerm ? 
            this.followers.filter(follower => follower.name.toLowerCase().includes(searchTerm)) : 
            this.followers;
        
        // Sort filtered followers
        const sortedFollowers = this.getSortedFollowers(filteredFollowers);
        
        // Update list
        this.followersList.innerHTML = '';
        
        sortedFollowers.forEach((follower, index) => {
            const originalIndex = this.followers.indexOf(follower);
            
            const li = document.createElement('li');
            li.className = 'follower-item';
            li.innerHTML = `
                <div class="follower-info">
                    <span class="follower-name">${follower.name}</span>
                    <span class="follower-date">${follower.date}</span>
                </div>
                <div class="follower-actions">
                    <button class="follower-btn locate" data-index="${originalIndex}" title="Locate tree">
                        <i class="fas fa-search"></i>
                    </button>
                    <button class="follower-btn delete" data-index="${originalIndex}" title="Remove follower">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            this.followersList.appendChild(li);
            
            // Add event listeners to buttons
            const locateBtn = li.querySelector('.locate');
            const deleteBtn = li.querySelector('.delete');
            
            locateBtn.addEventListener('click', () => this.locateTree(originalIndex));
            deleteBtn.addEventListener('click', () => this.removeFollower(originalIndex));
        });
        
        // Update follower count in footer
        if (this.followersCount) {
            this.followersCount.textContent = `${filteredFollowers.length} follower${filteredFollowers.length !== 1 ? 's' : ''}${searchTerm ? ' (filtered)' : ''}`;
        }
    }
    
    sortFollowers() {
        const sortBy = this.followerSort ? this.followerSort.value : 'newest';
        
        // Get sorted followers
        const sortedFollowers = this.getSortedFollowers(this.followers);
        
        return sortedFollowers;
    }
    
    getSortedFollowers(followers) {
        const sortBy = this.followerSort ? this.followerSort.value : 'newest';
        
        return [...followers].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.date) - new Date(a.date);
                case 'oldest':
                    return new Date(a.date) - new Date(b.date);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
    }
    
    locateTree(followerIndex) {
        // Find tree
        const tree = this.trees.find(tree => tree.followerIndex === followerIndex);
        
        if (tree) {
            // Switch to orbit mode
            this.enableOrbitMode();
            
            // Calculate camera position to focus on tree
            const treePosition = tree.mesh.position.clone();
            const cameraDistance = 50;
            const cameraHeight = 30;
            
            // Random angle to view the tree from
            const angle = Math.random() * Math.PI * 2;
            
            const cameraPosition = new THREE.Vector3(
                treePosition.x + Math.cos(angle) * cameraDistance,
                treePosition.y + cameraHeight,
                treePosition.z + Math.sin(angle) * cameraDistance
            );
            
            // Smoothly move camera
            gsap.to(this.camera.position, {
                x: cameraPosition.x,
                y: cameraPosition.y,
                z: cameraPosition.z,
                duration: 1.5,
                ease: "power2.inOut",
                onUpdate: () => {
                    this.camera.lookAt(treePosition);
                }
            });
            
            // Update orbit controls to center on this tree
            this.targetPosition.copy(treePosition);
            this.orbitRadius = cameraDistance;
            this.orbitHeight = cameraHeight;
            this.orbitAngle = angle;
            
            // Highlight tree temporarily
            const originalScale = tree.mesh.scale.clone();
            
            gsap.to(tree.mesh.scale, {
                x: originalScale.x * 1.3,
                y: originalScale.y * 1.3,
                z: originalScale.z * 1.3,
                duration: 0.5,
                yoyo: true,
                repeat: 2,
                ease: "power1.inOut"
            });
            
            // Add a highlight glow effect
            const glowGeometry = new THREE.SphereGeometry(5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00CA99,
                transparent: true,
                opacity: 0.5
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(treePosition);
            glow.position.y += 5;
            glow.scale.set(0, 0, 0);
            this.scene.add(glow);
            
            // Animate glow
            gsap.to(glow.scale, {
                x: 3,
                y: 3,
                z: 3,
                duration: 1,
                ease: "power2.out",
                onComplete: () => {
                    gsap.to(glow.material, {
                        opacity: 0,
                        duration: 2,
                        ease: "power2.out",
                        onComplete: () => {
                            this.scene.remove(glow);
                        }
                    });
                }
            });
        }
    }
    
    toggleFollowersPanel() {
        if (this.followersPanel.style.display === 'none' || !this.followersPanel.style.display) {
            this.followersPanel.style.display = 'block';
            this.updateFollowersList();
        } else {
            this.followersPanel.style.display = 'none';
        }
    }
    
    resetCamera() {
        // Smoothly reset camera position based on current mode
        if (this.isOrbitMode) {
            // Reset orbit parameters
            this.orbitRadius = 200;
            this.orbitHeight = 100;
            this.orbitAngle = 0;
            this.targetPosition.set(0, 0, 0);
            
            gsap.to(this.camera.position, {
                x: Math.cos(this.orbitAngle) * this.orbitRadius,
                y: this.orbitHeight,
                z: Math.sin(this.orbitAngle) * this.orbitRadius,
                duration: 1.5,
                ease: "power2.inOut",
                onUpdate: () => {
                    this.camera.lookAt(this.targetPosition);
                }
            });
        } else if (this.isFirstPersonMode) {
            // Reset first-person position
            gsap.to(this.camera.position, {
                x: 0,
                y: 5,
                z: 80,
                duration: 1.5,
                ease: "power2.inOut",
                onUpdate: () => {
                    this.camera.lookAt(0, 5, 0);
                }
            });
        } else {
            // Top view reset
            gsap.to(this.camera.position, {
                x: 0,
                y: 300,
                z: 0,
                duration: 1.5,
                ease: "power2.inOut",
                onUpdate: () => {
                    this.camera.lookAt(0, 0, 0);
                }
            });
        }
    }
    
    generateTrees() {
        // Remove existing trees
        this.trees.forEach(tree => {
            this.scene.remove(tree.mesh);
        });
        this.trees = [];
        
        // If no followers, return
        if (this.followers.length === 0) return;
        
        // Generate trees for each chapter based on follower count
        this.chapters.forEach(chapter => {
            // Skip if follower count is below this chapter's range
            if (this.followers.length < chapter.min) return;
            
            // Calculate how many trees to place in this chapter
            const treesInChapter = Math.min(
                this.followers.length - (chapter.min - 1),
                chapter.max - (chapter.min - 1)
            );
            
            // Generate positions and add trees
            if (chapter.id === 1) {
                // First chapter: spiral pattern
                this.generateSpiralTrees(
                    treesInChapter, 
                    chapter, 
                    chapter.min - 1
                );
            } else {
                // Other chapters: grid pattern
                this.generateGridTrees(
                    treesInChapter, 
                    chapter, 
                    chapter.min - 1
                );
            }
        });
    }
    
    generateSpiralTrees(count, chapter, startIndex) {
        // Spiral parameters - enhanced for better spacing
        // Use golden ratio for more natural distribution
        const phi = 1.618033988749895;
        const a = 2.0; // Controls spacing between trees
        const maxRadius = chapter.radius * 0.85;
        
        for (let i = 0; i < count; i++) {
            // Calculate angle based on golden ratio
            const angle = i * Math.PI * 2 / phi;
            const radius = a * Math.sqrt(i);
            
            // Limit to max radius
            if (radius > maxRadius) break;
            
            // Calculate position
            const x = chapter.position.x + radius * Math.cos(angle);
            const z = chapter.position.z + radius * Math.sin(angle);
            
            // Get terrain height at this position
            const y = this.getTerrainHeightAtPosition(x, z);
            
            // Add tree
            this.addTree(x, y, z, startIndex + i);
        }
    }
    
    generateGridTrees(count, chapter, startIndex) {
        // Grid parameters based on count - improved spacing
        const gridSize = Math.ceil(Math.sqrt(count * 1.5));
        const cellSize = (chapter.radius * 2) / gridSize;
        
        // Starting position (top-left of grid)
        const startX = chapter.position.x - chapter.radius + cellSize / 2;
        const startZ = chapter.position.z - chapter.radius + cellSize / 2;
        
        let treesPlaced = 0;
        
        // Place trees in grid with randomness for natural appearance
        for (let row = 0; row < gridSize && treesPlaced < count; row++) {
            for (let col = 0; col < gridSize && treesPlaced < count; col++) {
                // Base position
                const baseX = startX + col * cellSize;
                const baseZ = startZ + row * cellSize;
                
                // Add randomness within cell
                const x = baseX + (Math.random() - 0.5) * cellSize * 0.7;
                const z = baseZ + (Math.random() - 0.5) * cellSize * 0.7;
                
                // Get terrain height at this position
                const y = this.getTerrainHeightAtPosition(x, z);
                
                // Check if position is within chapter radius
                const distanceFromCenter = Math.sqrt(
                    Math.pow(x - chapter.position.x, 2) + 
                    Math.pow(z - chapter.position.z, 2)
                );
                
                if (distanceFromCenter <= chapter.radius) {
                    this.addTree(x, y, z, startIndex + treesPlaced);
                    treesPlaced++;
                }
            }
        }
        
        // Fill any remaining needed trees in random positions
        while (treesPlaced < count) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * chapter.radius * 0.9;
            
            const x = chapter.position.x + Math.cos(angle) * radius;
            const z = chapter.position.z + Math.sin(angle) * radius;
            const y = this.getTerrainHeightAtPosition(x, z);
            
            this.addTree(x, y, z, startIndex + treesPlaced);
            treesPlaced++;
        }
    }
    
    addTree(x, y, z, followerIndex) {
        // Determine tree type based on follower name for consistency
        const follower = this.followers[followerIndex];
        const nameHash = this.hashString(follower.name);
        const templateIndex = nameHash % this.treeTemplates.length;
        
        // Clone the template
        const template = this.treeTemplates[templateIndex];
        const treeMesh = template.clone();
        
        // Add variation with scaling
        const scale = 0.8 + ((nameHash % 5) / 10);
        treeMesh.scale.set(scale, scale, scale);
        
        // Position
        treeMesh.position.set(x, y, z);
        
        // Random rotation
        treeMesh.rotation.y = Math.random() * Math.PI * 2;
        
        // Add to scene
        this.scene.add(treeMesh);
        
        // Store tree data
        this.trees.push({
            mesh: treeMesh,
            followerIndex: followerIndex,
            position: new THREE.Vector3(x, y, z),
            type: templateIndex
        });
    }
    
    hashString(str) {
        // Simple hash function for consistent tree type based on name
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    
    setTimeOfDay(time) {
        this.currentTimeOfDay = time;
        
        // Update UI
        document.querySelectorAll('.time-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-time="${time}"]`).classList.add('active');
        
        // Define lighting settings for different times of day
        const timeSettings = {
            day: {
                skyTop: new THREE.Color(0x0077ff),
                skyBottom: new THREE.Color(0xffffff),
                sunColor: 0xffffff,
                sunIntensity: 1,
                ambientIntensity: 0.5,
                hemiIntensity: 0.6,
                sunPosition: { x: 50, y: 100, z: 50 },
                fogColor: 0xf0f9ff,
                fogDensity: 0.002
            },
            sunset: {
                skyTop: new THREE.Color(0x1a237e),
                skyBottom: new THREE.Color(0xff7043),
                sunColor: 0xff9800,
                sunIntensity: 0.8,
                ambientIntensity: 0.3,
                hemiIntensity: 0.4,
                sunPosition: { x: -80, y: 30, z: -50 },
                fogColor: 0xffab91,
                fogDensity: 0.004
            },
            night: {
                skyTop: new THREE.Color(0x000033),
                skyBottom: new THREE.Color(0x0d47a1),
                sunColor: 0x3d5afe,
                sunIntensity: 0.2,
                ambientIntensity: 0.2,
                hemiIntensity: 0.1,
                sunPosition: { x: -100, y: 10, z: -80 },
                fogColor: 0x0d1a26,
                fogDensity: 0.006
            }
        };
        
        const settings = timeSettings[time];
        
        // Update sky colors with smooth transition
        gsap.to(this.skyMaterial.uniforms.topColor.value, {
            r: settings.skyTop.r,
            g: settings.skyTop.g,
            b: settings.skyTop.b,
            duration: 2
        });
        
        gsap.to(this.skyMaterial.uniforms.bottomColor.value, {
            r: settings.skyBottom.r,
            g: settings.skyBottom.g,
            b: settings.skyBottom.b,
            duration: 2
        });
        
        // Update lighting
        this.sunLight.color.set(settings.sunColor);
        gsap.to(this.sunLight, {
            intensity: settings.sunIntensity,
            duration: 2
        });
        
        gsap.to(this.ambientLight, {
            intensity: settings.ambientIntensity,
            duration: 2
        });
        
        gsap.to(this.hemiLight, {
            intensity: settings.hemiIntensity,
            duration: 2
        });
        
        // Update sun position
        gsap.to(this.sunLight.position, {
            x: settings.sunPosition.x,
            y: settings.sunPosition.y,
            z: settings.sunPosition.z,
            duration: 2
        });
        
        // Update fog
        if (!this.scene.fog) {
            this.scene.fog = new THREE.FogExp2(settings.fogColor, settings.fogDensity);
        } else {
            gsap.to(this.scene.fog.color, {
                r: new THREE.Color(settings.fogColor).r,
                g: new THREE.Color(settings.fogColor).g,
                b: new THREE.Color(settings.fogColor).b,
                duration: 2
            });
            
            gsap.to(this.scene.fog, {
                density: settings.fogDensity,
                duration: 2
            });
        }
        
        // Add special effects for each time of day
        this.createTimeOfDayEffects(time);
    }
    
    createTimeOfDayEffects(time) {
        // Remove previous effects
        if (this.timeEffects) {
            this.timeEffects.forEach(effect => {
                this.scene.remove(effect);
            });
        }
        
        this.timeEffects = [];
        
        // Add specific effects based on time of day
        switch (time) {
            case 'sunset':
                // Add sun rays
                this.createSunRays();
                break;
            case 'night':
                // Add stars
                this.createStars();
                break;
        }
    }
    
    createSunRays() {
        // Create sun rays effect with sprite
        const rayTexture = this.createSunRayTexture();
        const rayMaterial = new THREE.SpriteMaterial({
            map: rayTexture,
            transparent: true,
            opacity: 0.7,
            color: 0xffcc80
        });
        
        const rays = new THREE.Sprite(rayMaterial);
        rays.position.copy(this.sunLight.position);
        rays.position.multiplyScalar(0.8); // Bring closer to camera
        rays.scale.set(200, 200, 1);
        
        this.scene.add(rays);
        this.timeEffects.push(rays);
    }
    
    createSunRayTexture() {
        // Create a canvas for sun rays
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // Draw radial gradient for sun rays
        const gradient = context.createRadialGradient(
            128, 128, 20,
            128, 128, 128
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.1, 'rgba(255, 200, 100, 0.3)');
        gradient.addColorStop(0.2, 'rgba(255, 150, 50, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        
        // Create rays
        context.save();
        context.translate(128, 128);
        
        const rayCount = 12;
        context.fillStyle = 'rgba(255, 255, 255, 0.3)';
        
        for (let i = 0; i < rayCount; i++) {
            context.rotate(Math.PI * 2 / rayCount);
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(-10, 150);
            context.lineTo(10, 150);
            context.closePath();
            context.fill();
        }
        
        context.restore();
        
        // Create texture
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    createStars() {
        // Create stars in night sky
        const starCount = 1000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        const starSizes = [];
        
        for (let i = 0; i < starCount; i++) {
            // Position stars on a dome above the scene
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI * 0.5;
            
            const radius = 1000;
            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.cos(theta);
            const z = radius * Math.sin(theta) * Math.sin(phi);
            
            starPositions.push(x, y, z);
            
            // Random star sizes
            starSizes.push(0.5 + Math.random() * 1.5);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 1,
            sizeAttenuation: false,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        const starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(starField);
        this.timeEffects.push(starField);
        
        // Add a few larger stars that twinkle
        const bigStarCount = 50;
        const twinkleGeometry = new THREE.BufferGeometry();
        const twinklePositions = [];
        
        for (let i = 0; i < bigStarCount; i++) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI * 0.5;
            
            const radius = 900;
            const x = radius * Math.sin(theta) * Math.cos(phi);
            const y = radius * Math.cos(theta);
            const z = radius * Math.sin(theta) * Math.sin(phi);
            
            twinklePositions.push(x, y, z);
        }
        
        twinkleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(twinklePositions, 3));
        
        const twinkleTexture = this.createStarTexture();
        const twinkleMaterial = new THREE.PointsMaterial({
            size: 5,
            map: twinkleTexture,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: false
        });
        
        const twinkleStars = new THREE.Points(twinkleGeometry, twinkleMaterial);
        twinkleStars.userData = {
            originalPositions: twinklePositions.slice(),
            twinkleSpeeds: []
        };
        
        // Assign random twinkle speeds to each star
        for (let i = 0; i < bigStarCount; i++) {
            twinkleStars.userData.twinkleSpeeds.push(0.5 + Math.random() * 2);
        }
        
        this.scene.add(twinkleStars);
        this.timeEffects.push(twinkleStars);
    }
    
    createStarTexture() {
        // Create a canvas for star texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        
        // Draw star
        const gradient = context.createRadialGradient(
            16, 16, 0,
            16, 16, 16
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(128, 128, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 64, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        // Create texture
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Current time
        const time = performance.now() * 0.001;
        
        // Performance monitoring
        if (time - this.stats.lastCalcTime > 1) {
            this.stats.fps = Math.round(1 / (time - this.stats.lastFrameTime));
            this.stats.frameTime = Math.round((time - this.stats.lastFrameTime) * 1000);
            this.stats.lastCalcTime = time;
            this.stats.treeCount = this.trees.length;
        }
        this.stats.lastFrameTime = time;
        
        // Update camera position for auto-rotation
        if (this.isAutoRotating && this.isOrbitMode) {
            this.orbitAngle += 0.002;
            this.camera.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
            this.camera.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
            this.camera.lookAt(this.targetPosition);
        }
        
        // Update camera position based on keyboard controls in first-person mode
        if (this.isFirstPersonMode) {
            const speed = this.cameraControls.moveSpeed;
            
            // Calculate movement direction based on camera orientation
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            
            // Forward/backward movement
            if (this.cameraControls.moveForward) {
                this.camera.position.add(direction.multiplyScalar(speed));
            } else if (this.cameraControls.moveBackward) {
                this.camera.getWorldDirection(direction);
                this.camera.position.sub(direction.multiplyScalar(speed));
            }
            
            // Left/right movement (strafe)
            if (this.cameraControls.moveLeft || this.cameraControls.moveRight) {
                this.camera.getWorldDirection(direction);
                const perpendicular = new THREE.Vector3();
                perpendicular.crossVectors(direction, new THREE.Vector3(0, 1, 0));
                perpendicular.normalize();
                
                if (this.cameraControls.moveLeft) {
                    this.camera.position.sub(perpendicular.multiplyScalar(speed));
                } else if (this.cameraControls.moveRight) {
                    this.camera.position.add(perpendicular.multiplyScalar(speed));
                }
            }
        }
        
        // Animate butterflies
        if (this.butterflies && this.butterflies.length > 0) {
            this.butterflies.forEach(butterfly => {
                const data = butterfly.userData;
                
                // Wing flapping animation
                if (butterfly.children && butterfly.children.length >= 2) {
                    const leftWing = butterfly.children[0];
                    const rightWing = butterfly.children[1];
                    
                    const flapAmount = Math.sin(time * data.wingSpeed) * 0.5;
                    leftWing.rotation.y = Math.PI / 4 - flapAmount;
                    rightWing.rotation.y = -Math.PI / 4 + flapAmount;
                }
                
                // Movement animation
                butterfly.position.y = data.originalY + Math.sin(time * 2) * 1.5;
                butterfly.position.x += Math.sin(time * data.speed + data.phase) * 0.05;
                butterfly.position.z += Math.cos(time * data.speed * 0.7 + data.phase) * 0.05;
                
                // Rotation to face movement direction
                butterfly.rotation.y = Math.sin(time * data.speed) * 0.5;
            });
        }
        
        // Animate birds
        if (this.birds && this.birds.length > 0) {
            this.birds.forEach(bird => {
                const data = bird.userData;
                
                // Wing flapping animation
                if (bird.children && bird.children.length >= 2) {
                    const leftWing = bird.children[1];
                    const rightWing = bird.children[2];
                    
                    const flapAmount = Math.sin(time * data.wingSpeed) * 0.5;
                    leftWing.rotation.z = flapAmount;
                    rightWing.rotation.z = -flapAmount;
                }
                
                // Movement animation based on direction
                bird.position.x += data.direction.x * data.speed * 0.1;
                bird.position.z += data.direction.z * data.speed * 0.1;
                bird.position.y = data.originalY + Math.sin(time * 1.5) * 0.5;
                
                // Rotation to face movement direction
                bird.rotation.y = Math.atan2(data.direction.z, data.direction.x);
                
                // Reset position if bird flies too far
                const distanceFromCenter = Math.sqrt(
                    bird.position.x * bird.position.x + 
                    bird.position.z * bird.position.z
                );
                
                if (distanceFromCenter > 500) {
                    // Reset to opposite side
                    bird.position.x = -bird.position.x * 0.8;
                    bird.position.z = -bird.position.z * 0.8;
                    
                    // Randomize direction slightly
                    data.direction.x = -data.direction.x + (Math.random() - 0.5) * 0.2;
                    data.direction.z = -data.direction.z + (Math.random() - 0.5) * 0.2;
                    data.direction.normalize();
                }
            });
        }
        
        // Animate butterfly particles
        if (this.butterflyParticles && this.butterflyParticles.visible) {
            const positions = this.butterflyParticles.geometry.attributes.position.array;
            
            for (let i = 0; i < this.butterfliesData.length; i++) {
                const butterfly = this.butterfliesData[i];
                const idx = i * 3;
                
                // Calculate fluttering motion
                const flutterY = Math.sin(time * butterfly.flutterSpeed) * 1.5;
                const wanderX = Math.sin(time * butterfly.speed + butterfly.phase) * 5;
                const wanderZ = Math.cos(time * butterfly.speed * 0.7 + butterfly.phase) * 5;
                
                // Update position
                positions[idx] = butterfly.originalX + wanderX;
                positions[idx + 1] = butterfly.originalY + flutterY;
                positions[idx + 2] = butterfly.originalZ + wanderZ;
            }
            
            this.butterflyParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Animate falling leaves
        if (this.leafParticles && this.leafParticles.visible) {
            const positions = this.leafParticles.geometry.attributes.position.array;
            
            for (let i = 0; i < this.leavesData.length; i++) {
                const leaf = this.leavesData[i];
                const idx = i * 3;
                
                // Calculate falling and swaying motion
                const swayX = Math.sin(time * leaf.swaySpeed + leaf.phase) * 2;
                let y = positions[idx + 1] - leaf.fallSpeed;
                
                // Reset if leaf reaches ground
                if (y < 0.5) {
                    y = leaf.originalY;
                }
                
                // Update position
                positions[idx] = leaf.originalX + swayX;
                positions[idx + 1] = y;
            }
            
            this.leafParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Animate snow
        if (this.snowParticles && this.snowParticles.visible) {
            const positions = this.snowParticles.geometry.attributes.position.array;
            
            for (let i = 0; i < this.snowData.length; i++) {
                const snow = this.snowData[i];
                const idx = i * 3;
                
                // Calculate falling and swaying motion
                const swayX = Math.sin(time * snow.swaySpeed + snow.phase) * snow.swaySeverity;
                const swayZ = Math.cos(time * snow.swaySpeed * 0.6 + snow.phase) * snow.swaySeverity;
                let y = positions[idx + 1] - snow.fallSpeed;
                
                // Reset if snowflake reaches ground
                if (y < 0.5) {
                    y = snow.originalY;
                    positions[idx] = snow.originalX + (Math.random() - 0.5) * 20; // Randomize X position for variety
                    positions[idx + 2] = snow.originalZ + (Math.random() - 0.5) * 20; // Randomize Z position for variety
                }
                
                // Update position
                positions[idx] += swayX;
                positions[idx + 1] = y;
                positions[idx + 2] += swayZ;
            }
            
            this.snowParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Add subtle wave animation to water
        if (this.lake) {
            this.lake.position.y = this.getTerrainHeightAtPosition(this.lake.position.x, this.lake.position.z) - 0.2 + Math.sin(time * 0.5) * 0.1;
        }
        
        // Animate twinkling stars if night time
        if (this.currentTimeOfDay === 'night' && this.timeEffects) {
            this.timeEffects.forEach(effect => {
                if (effect.userData && effect.userData.twinkleSpeeds) {
                    const positions = effect.geometry.attributes.position.array;
                    
                    for (let i = 0; i < effect.userData.twinkleSpeeds.length; i++) {
                        const speed = effect.userData.twinkleSpeeds[i];
                        const idx = i * 3;
                        
                        // Subtle movement for twinkling effect
                        positions[idx] = effect.userData.originalPositions[idx] + Math.sin(time * speed) * 2;
                        positions[idx + 1] = effect.userData.originalPositions[idx + 1] + Math.cos(time * speed * 0.7) * 2;
                        positions[idx + 2] = effect.userData.originalPositions[idx + 2] + Math.sin(time * speed * 0.5 + 1) * 2;
                    }
                    
                    effect.geometry.attributes.position.needsUpdate = true;
                    
                    // Twinkle opacity
                    effect.material.opacity = 0.7 + Math.sin(time * 2) * 0.3;
                }
            });
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}
