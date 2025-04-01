// Ensure Three.js is loaded before starting
window.onload = function() {
    console.log("Window loaded");
    console.log("THREE available:", typeof THREE !== 'undefined');
    console.log("GSAP available:", typeof gsap !== 'undefined');
    
    try {
        // Initialize the Pura Forest application
        const app = new PuraForestApp();
        console.log("App initialized successfully");
    } catch (error) {
        console.error("Failed to initialize app:", error);
    }
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
        this.isAutoRotating = false;
        this.isPanelVisible = true;
        this.isFirstPersonMode = false;
        this.isOrbitMode = true;
        this.isUIVisible = true;
        
        // Quality settings
        this.quality = 'medium'; // 'medium', 'high', 'ultra'
        this.particleDensity = 'medium'; // 'low', 'medium', 'high'
        
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
            { progress: 60, message: "Adding particles..." },
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
        
        // Setup Performance monitor
        this.stats = {
            fps: 0,
            frameTime: 0,
            treeCount: 0,
            lastFrameTime: 0,
            lastCalcTime: 0
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
    
    initUI() {
        // Get UI elements
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
        
        // Exact follower count elements
        this.exactFollowerCount = document.getElementById('exact-follower-count');
        this.increaseFollowersBtn = document.getElementById('increase-followers');
        this.decreaseFollowersBtn = document.getElementById('decrease-followers');
        this.updateFollowerCountBtn = document.getElementById('update-follower-count');
        
        // Quality setting buttons
        this.qualityBtns = document.querySelectorAll('.quality-btn');
        this.particleBtns = document.querySelectorAll('.particle-btn');
        
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
        
        // Setup event listeners
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
        
        // Follower count controls
        this.increaseFollowersBtn.addEventListener('click', () => {
            this.exactFollowerCount.value = Math.min(parseInt(this.exactFollowerCount.value || 0) + 1, 3000);
        });
        
        this.decreaseFollowersBtn.addEventListener('click', () => {
            this.exactFollowerCount.value = Math.max(parseInt(this.exactFollowerCount.value || 0) - 1, 0);
        });
        
        this.updateFollowerCountBtn.addEventListener('click', this.updateExactFollowerCount.bind(this));
        
        // Quality settings
        this.qualityBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setQuality(btn.dataset.quality));
        });
        
        this.particleBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setParticleDensity(btn.dataset.density));
        });
        
        // Toggle panel
        this.togglePanelBtn.addEventListener('click', this.toggleControlPanel.bind(this));
        
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
    }
    
    // Update exact follower count
    updateExactFollowerCount() {
        const count = parseInt(this.exactFollowerCount.value);
        
        // Set valid range
        if (isNaN(count)) {
            this.exactFollowerCount.value = this.followers.length;
            return;
        }
        
        const validCount = Math.max(0, Math.min(count, 3000));
        this.exactFollowerCount.value = validCount;
        
        // Update followers array
        if (validCount > this.followers.length) {
            this.generateSampleFollowers(validCount - this.followers.length);
        } else if (validCount < this.followers.length) {
            this.followers = this.followers.slice(0, validCount);
        }
        
        // Update UI
        this.followerCounter.textContent = validCount;
        
        // Update trees and UI
        this.generateTrees();
        this.updateFollowersList();
        this.updateProgressBar();
    }
    
    // Quality settings
    setQuality(quality) {
        if (this.quality === quality) return;
        
        this.quality = quality;
        
        // Update UI
        this.qualityBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.quality === quality);
        });
        
        // Update renderer settings
        switch (quality) {
            case 'medium':
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                this.renderer.shadowMap.type = THREE.PCFShadowMap;
                break;
            case 'high':
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
            case 'ultra':
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
        }
        
        // Regenerate scene with new quality
        this.regenerateSceneWithQuality();
    }
    
    setParticleDensity(density) {
        if (this.particleDensity === density) return;
        
        this.particleDensity = density;
        
        // Update UI
        this.particleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.density === density);
        });
        
        // Regenerate particles
        this.createParticleSystems();
    }
    
    regenerateSceneWithQuality() {
        // Recreate trees with enhanced detail based on quality setting
        this.createTreeTemplates();
        this.generateTrees();
        
        // Update environment detail
        this.updateEnvironmentDetail();
    }
    
    updateEnvironmentDetail() {
        // Adjust fog density based on quality
        const fogDensities = {
            medium: 0.004,
            high: 0.003,
            ultra: 0.002
        };
        
        if (this.scene.fog) {
            this.scene.fog.density = fogDensities[this.quality];
        }
        
        // Create or update environment details based on quality
        switch (this.quality) {
            case 'ultra':
                // Add extra details like grass, rocks, etc.
                if (!this.extraDetails) {
                    this.extraDetails = this.createExtraDetails();
                }
                break;
            case 'high':
                // Medium level of extra details
                break;
            case 'medium':
                // Remove extra details to improve performance
                if (this.extraDetails) {
                    this.extraDetails.forEach(detail => this.scene.remove(detail));
                    this.extraDetails = null;
                }
                break;
        }
    }
    
    createExtraDetails() {
        const details = [];
        
        // Add grass tufts
        for (let i = 0; i < 200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 50 + Math.random() * 300;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Skip areas where trees are concentrated
            let skipPosition = false;
            for (const chapter of this.chapters) {
                const distToChapter = Math.sqrt(
                    Math.pow(x - chapter.position.x, 2) +
                    Math.pow(z - chapter.position.z, 2)
                );
                if (distToChapter < chapter.radius * 0.8) {
                    skipPosition = true;
                    break;
                }
            }
            
            if (skipPosition) continue;
            
            // Create grass tuft
            const grassHeight = 1 + Math.random() * 1.5;
            const grassGeometry = new THREE.PlaneGeometry(1.5, grassHeight);
            const grassMaterial = new THREE.MeshBasicMaterial({
                color: 0x66bb6a,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            const y = this.getTerrainHeightAtPosition(x, z);
            grass.position.set(x, y + grassHeight * 0.5, z);
            grass.rotation.y = Math.random() * Math.PI;
            
            this.scene.add(grass);
            details.push(grass);
        }
        
        return details;
    }
    
    createEnvironment() {
        // Create enhanced terrain
        this.createTerrain();
        
        // Create sky
        this.createSky();
        
        // Add lighting
        this.createLighting();
        
        // Add water features
        this.createLake();
        
        // Add decorative elements
        this.createPathways();
        this.createRocks();
    }
    
    createTerrain() {
        // Create a more interesting ground with subtle height variations
        const terrainSize = 2500;
        const resolution = 128; // Lower resolution for better performance
        const heightScale = 15;
        this.terrainResolution = resolution;
        
        // Generate heightmap
        this.heightmap = new Float32Array(resolution * resolution);
        
        // Perlin noise for natural-looking terrain
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const index = i * resolution + j;
                
                // Use multiple frequencies for more natural terrain
                const x1 = i / resolution * 5;
                const y1 = j / resolution * 5;
                const value1 = this.perlinNoise2D(x1, y1);
                
                const x2 = i / resolution * 10;
                const y2 = j / resolution * 10;
                const value2 = this.perlinNoise2D(x2, y2) * 0.5;
                
                const x3 = i / resolution * 20;
                const y3 = j / resolution * 20;
                const value3 = this.perlinNoise2D(x3, y3) * 0.25;
                
                this.heightmap[index] = (value1 + value2 + value3) * heightScale;
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
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.ground = ground;
        
        // Create chapter areas with raised platforms
        this.chapters.forEach(chapter => {
            this.createChapterGround(chapter);
        });
        
        // Add fog for atmosphere
        this.scene.fog = new THREE.FogExp2(0xc3efd9, 0.002);
    }
    
    // Perlin noise function for terrain generation
    perlinNoise2D(x, y) {
        function fade(t) {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }
        
        function lerp(t, a, b) {
            return a + t * (b - a);
        }
        
        function grad(hash, x, y) {
            const h = hash & 15;
            const gradX = (h < 8) ? x : y;
            const gradY = (h < 4) ? y : ((h === 12 || h === 14) ? x : 0);
            return ((h & 1) ? -gradX : gradX) + ((h & 2) ? -gradY : gradY);
        }
        
        // Permutation table
        const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        
        const perm = [];
        for (let i = 0; i < 512; i++) {
            perm[i] = p[i & 255];
        }
        
        // Unit grid cell coordinates
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        // Relative coordinates in unit grid cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        // Compute fade curves
        const u = fade(x);
        const v = fade(y);
        
        // Hash coordinates
        const A = perm[X] + Y;
        const B = perm[X + 1] + Y;
        
        // Blend the four corners
        return lerp(v, lerp(u, grad(perm[A], x, y), 
                               grad(perm[B], x - 1, y)),
                       lerp(u, grad(perm[A + 1], x, y - 1), 
                               grad(perm[B + 1], x - 1, y - 1)));
    }
    
    getTerrainHeightAtPosition(x, z) {
        // Convert world position to heightmap coordinates
        const terrainSize = 2500;
        const halfSize = terrainSize / 2;
        
        // Normalize to 0-1
        const normX = (x + halfSize) / terrainSize;
        const normZ = (z + halfSize) / terrainSize;
        
        // Check bounds
        if (normX < 0 || normX >= 1 || normZ < 0 || normZ >= 1) {
            return 0;
        }
        
        // Convert to heightmap indices
        const resolution = this.terrainResolution;
        const i = Math.floor(normX * (resolution - 1));
        const j = Math.floor(normZ * (resolution - 1));
        
        // Get height from heightmap
        const index = i * resolution + j;
        return this.heightmap[index] || 0;
    }
    
    createChapterGround(chapter) {
        // Create circular platform for each chapter
        const geometry = new THREE.CircleGeometry(chapter.radius, 64);
        
        const material = new THREE.MeshStandardMaterial({
            color: chapter.id === 1 ? 0x9ccc65 : 0x7cb342,
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
        
        // Store chapter platform for updates
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
        
        // Create a better lake with proper depth
        const lakeGeometry = new THREE.CircleGeometry(180, 64);
        
        const lakeMaterial = new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            metalness: 0.9,
            roughness: 0.1,
            opacity: 0.8,
            transparent: true
        });
        
        const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
        lake.rotation.x = -Math.PI / 2;
        
        // Raise the lake slightly above the terrain to prevent z-fighting
        const lakeX = 100;
        const lakeZ = -120;
        const lakeHeight = this.getTerrainHeightAtPosition(lakeX, lakeZ);
        
        lake.position.set(lakeX, lakeHeight + 0.2, lakeZ); // Add small offset to prevent z-fighting
        this.lake = lake;
        this.scene.add(lake);
        
        // Create a lake bed that sits below the water surface
        const lakeBedGeometry = new THREE.CircleGeometry(185, 64); // Slightly larger
        const lakeBedMaterial = new THREE.MeshStandardMaterial({
            color: 0x26a69a,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const lakeBed = new THREE.Mesh(lakeBedGeometry, lakeBedMaterial);
        lakeBed.rotation.x = -Math.PI / 2;
        lakeBed.position.set(lakeX, lakeHeight - 0.1, lakeZ); // Below water level
        this.scene.add(lakeBed);
        
        // Add shore/border
        const shoreGeometry = new THREE.RingGeometry(180, 190, 64);
        const shoreMaterial = new THREE.MeshStandardMaterial({
            color: 0xd2b48c, // Sand color
            roughness: 0.9,
            metalness: 0.1
        });
        
        const shore = new THREE.Mesh(shoreGeometry, shoreMaterial);
        shore.rotation.x = -Math.PI / 2;
        shore.position.set(lakeX, lakeHeight + 0.15, lakeZ);
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
        
        // Add subtle point lights at each chapter
        this.chapters.forEach(chapter => {
            const light = new THREE.PointLight(0x00CA99, 1, 150);
            const height = this.getTerrainHeightAtPosition(chapter.position.x, chapter.position.z);
            light.position.set(chapter.position.x, height + 10, chapter.position.z);
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
    
    createParticleSystems() {
        // Remove previous particles
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
        }
        
        // Determine particle count based on density setting
        let particleCount;
        switch (this.particleDensity) {
            case 'low':
                particleCount = 500;
                break;
            case 'medium':
                particleCount = 1500;
                break;
            case 'high':
                particleCount = 3000;
                break;
            default:
                particleCount = 1500;
        }
        
        // Create particle system
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Colors
        const color1 = new THREE.Color(0x00CA99); // Brand green
        const color2 = new THREE.Color(0x7EEFD5); // Brand light green
        const color3 = new THREE.Color(0xFFFFFF); // White
        
        // Generate particle data
        for (let i = 0; i < particleCount; i++) {
            // Random position in spherical coordinates
            const radius = 150 + Math.random() * 350; // Distance from center
            const theta = Math.random() * Math.PI * 2; // Horizontal angle
            const phi = Math.acos((Math.random() * 2) - 1); // Vertical angle
            
            // Convert to Cartesian coordinates
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta) * 0.5; // Flatter distribution
            const z = radius * Math.cos(phi);
            
            // Position
            positions[i * 3] = x;
            positions[i * 3 + 1] = Math.abs(y) + 20; // Keep above ground
            positions[i * 3 + 2] = z;
            
            // Size - varies with distance from center for depth effect
            const distance = Math.sqrt(x*x + z*z) / radius;
            sizes[i] = 1.5 * (1 - distance * 0.5);
            
            // Color - blend between brand colors
            const colorFactor = Math.random();
            
            let particleColor;
            if (colorFactor < 0.4) {
                particleColor = color1;
            } else if (colorFactor < 0.8) {
                particleColor = color2;
            } else {
                particleColor = color3;
            }
            
            colors[i * 3] = particleColor.r;
            colors[i * 3 + 1] = particleColor.g;
            colors[i * 3 + 2] = particleColor.b;
        }
        
        // Set attributes
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create particle texture
        const particleTexture = this.createParticleTexture();
        
        // Create material
        const particleMaterial = new THREE.PointsMaterial({
            size: 2,
            map: particleTexture,
            transparent: true,
            vertexColors: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        // Create particle system
        this.particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(this.particleSystem);
        
        // Store original positions for animation
        this.particleData = [];
        
        for (let i = 0; i < particleCount; i++) {
            this.particleData.push({
                originalX: positions[i * 3],
                originalY: positions[i * 3 + 1],
                originalZ: positions[i * 3 + 2],
                speed: 0.1 + Math.random() * 0.3,
                amplitude: 0.5 + Math.random() * 1.5,
                phase: Math.random() * Math.PI * 2,
                size: sizes[i]
            });
        }
    }
    
    createParticleTexture() {
        // Create a canvas for particle texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Create gradient
        const gradient = context.createRadialGradient(
            32, 32, 0,
            32, 32, 32
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        // Draw particle
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        // Create texture
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    createTreeTemplates() {
        this.treeTemplates = [];
        
        // Define materials for trees
        const treeMaterials = {
            trunk: {
                color: 0x8d6e63,
                roughness: 0.9,
                metalness: 0.1
            },
            leaves: {
                color: 0x66bb6a,
                roughness: 0.8,
                metalness: 0.05
            }
        };
        
        // Create different tree types based on quality setting
        this.treeTemplates.push(this.createHighQualityConifer(treeMaterials));
        this.treeTemplates.push(this.createHighQualityOak(treeMaterials));
        this.treeTemplates.push(this.createHighQualityPine(treeMaterials));
        this.treeTemplates.push(this.createHighQualityMaple(treeMaterials));
        this.treeTemplates.push(this.createBonsaiTree(treeMaterials));
        
        // Add more tree types for higher quality settings
        if (this.quality === 'high' || this.quality === 'ultra') {
            this.treeTemplates.push(this.createPalmTree(treeMaterials));
            this.treeTemplates.push(this.createFloweringTree(treeMaterials));
        }
    }
    
    createHighQualityConifer(materials) {
        const tree = new THREE.Group();
        
        // Create detailed trunk with bark texture
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 6, 10);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        // Add noise to trunk vertices for more natural look
        if (this.quality === 'high' || this.quality === 'ultra') {
            const trunkPositions = trunkGeometry.attributes.position.array;
            
            for (let i = 0; i < trunkPositions.length; i += 3) {
                if (i % 9 !== 0) { // Don't modify top/bottom center points
                    const noise = (Math.random() - 0.5) * 0.1;
                    trunkPositions[i] += noise;
                    trunkPositions[i + 2] += noise;
                }
            }
            
            trunkGeometry.attributes.position.needsUpdate = true;
            trunkGeometry.computeVertexNormals();
        }
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Create foliage with multiple layers for realism
        const layerCount = this.quality === 'ultra' ? 5 : 4;
        
        for (let i = 0; i < layerCount; i++) {
            const y = 4 + i * 2.5;
            const size = 4 - i * 0.7;
            
            // Use more detailed geometry for higher qualities
            const foliageGeometry = this.quality === 'ultra' 
                ? new THREE.ConeGeometry(size, 3, 24)
                : new THREE.ConeGeometry(size, 3, 16);
            
            const foliageMaterial = new THREE.MeshStandardMaterial({
                color: materials.leaves.color,
                roughness: materials.leaves.roughness,
                metalness: materials.leaves.metalness
            });
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = y;
            foliage.castShadow = true;
            tree.add(foliage);
        }
        
        return tree;
    }
    
    createHighQualityOak(materials) {
        const tree = new THREE.Group();
        
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
            
            // Add leaf clusters
            const leafCluster = new THREE.Mesh(
                new THREE.SphereGeometry(length * 0.4, 6, 6),
                new THREE.MeshStandardMaterial(materials.leaves)
            );
            
            leafCluster.position.set(
                Math.sin(angle) * length,
                startY + Math.cos(angle) * length,
                0
            );
            leafCluster.castShadow = true;
            tree.add(leafCluster);
        };
        
        // Add branches at different heights and angles
        addBranch(3, 2, 0.2, Math.PI / 4);
        addBranch(4, 2.2, 0.2, -Math.PI / 4);
        addBranch(5, 1.8, 0.15, Math.PI / 3);
        addBranch(5.5, 1.6, 0.15, -Math.PI / 3);
        
        // Main foliage canopy
        const foliageGeometry = new THREE.SphereGeometry(3.5, 10, 10);
        const foliageMaterial = new THREE.MeshStandardMaterial(materials.leaves);
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 8;
        foliage.castShadow = true;
        tree.add(foliage);
        
        return tree;
    }
    
    createHighQualityPine(materials) {
        const tree = new THREE.Group();
        
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
            const foliageMaterial = new THREE.MeshStandardMaterial(materials.leaves);
            
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = y;
            foliage.castShadow = true;
            tree.add(foliage);
        }
        
        return tree;
    }
    
    createHighQualityMaple(materials) {
        const tree = new THREE.Group();
        
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
        
        // Foliage
        const foliageGeometry = new THREE.SphereGeometry(4, 10, 10);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x4caf50, // Maple green
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
        
        return tree;
    }
    
    createBonsaiTree(materials) {
        const tree = new THREE.Group();
        
        // Create curved trunk
        const curvePoints = [];
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const x = Math.sin(t * Math.PI * 0.5) * 0.3;
            const y = t * 4;
            const z = 0;
            curvePoints.push(new THREE.Vector3(x, y, z));
        }
        
        const trunkCurve = new THREE.CatmullRomCurve3(curvePoints);
        const trunkGeometry = new THREE.TubeGeometry(trunkCurve, 10, 0.3, 8, false);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Create foliage
        const foliageGeometry = new THREE.SphereGeometry(2, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x66bb6a,
            roughness: 0.8,
            metalness: 0.05
        });
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 4;
        foliage.scale.set(1.2, 0.7, 1.2); // Flattened sphere
        foliage.castShadow = true;
        tree.add(foliage);
        
        return tree;
    }
    
    createPalmTree(materials) {
        const tree = new THREE.Group();
        
        // Trunk
        const trunkHeight = 8;
        const trunkRadius = 0.3;
        const trunkSegments = 8;
        
        // Create curved trunk
        const trunkPoints = [];
        for (let i = 0; i <= trunkSegments; i++) {
            const y = (i / trunkSegments) * trunkHeight;
            const offset = 0.3 * Math.sin((i / trunkSegments) * Math.PI);
            trunkPoints.push(new THREE.Vector3(offset, y, 0));
        }
        
        const trunkCurve = new THREE.CatmullRomCurve3(trunkPoints);
        const trunkGeometry = new THREE.TubeGeometry(trunkCurve, 10, trunkRadius, 8, false);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0xa1887f,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Create palm leaves
        const leafCount = 7;
        for (let i = 0; i < leafCount; i++) {
            const angle = (i / leafCount) * Math.PI * 2;
            
            const leafGroup = new THREE.Group();
            
            // Create leaf stem
            const stemCurve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(Math.cos(angle) * 1.5, 0.5, Math.sin(angle) * 1.5),
                new THREE.Vector3(Math.cos(angle) * 3, -0.5, Math.sin(angle) * 3)
            );
            
            const stemGeometry = new THREE.TubeGeometry(stemCurve, 8, 0.1, 8, false);
            const stemMaterial = new THREE.MeshStandardMaterial({
                color: 0x7cb342,
                roughness: 0.8,
                metalness: 0.1
            });
            
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            leafGroup.add(stem);
            
            // Create leaf blade
            const leafShape = new THREE.Shape();
            leafShape.moveTo(0, 0);
            leafShape.bezierCurveTo(0.5, 0.2, 2, 0.5, 3, 0);
            leafShape.bezierCurveTo(2, -0.5, 0.5, -0.2, 0, 0);
            
            const leafGeometry = new THREE.ShapeGeometry(leafShape, 16);
            const leafMaterial = new THREE.MeshStandardMaterial({
                color: 0x4caf50,
                roughness: 0.8,
                metalness: 0.05,
                side: THREE.DoubleSide
            });
            
            // Create multiple leaf segments
            const segmentCount = 5;
            for (let j = 0; j < segmentCount; j++) {
                const t = j / (segmentCount - 1);
                const point = stemCurve.getPointAt(t);
                const tangent = stemCurve.getTangentAt(t);
                
                const leafSegment = new THREE.Mesh(leafGeometry, leafMaterial);
                leafSegment.position.copy(point);
                
                // Orient leaf to follow stem
                const normal = new THREE.Vector3(0, 1, 0);
                const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
                
                leafSegment.lookAt(point.clone().add(tangent));
                leafSegment.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
                
                // Scale leaf segments
                const scale = 0.2 + t * 0.3;
                leafSegment.scale.set(scale, scale, scale);
                
                leafGroup.add(leafSegment);
            }
            
            // Position at top of trunk
            leafGroup.position.y = trunkHeight;
            
            // Random rotation variation
            leafGroup.rotation.x = (Math.random() - 0.5) * 0.2;
            leafGroup.rotation.z = (Math.random() - 0.5) * 0.2;
            
            tree.add(leafGroup);
        }
        
        return tree;
    }
    
    createFloweringTree(materials) {
        const tree = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 5, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial(materials.trunk);
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Branches
        const addBranch = (startY, length, thickness, angle, zAngle) => {
            const branchGeometry = new THREE.CylinderGeometry(thickness * 0.6, thickness, length, 5);
            branchGeometry.translate(0, length / 2, 0);
            branchGeometry.rotateZ(angle);
            
            const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
            branch.position.y = startY;
            branch.rotation.y = zAngle;
            branch.castShadow = true;
            tree.add(branch);
            
            // Add flowers at end of branch
            if (this.quality === 'high' || this.quality === 'ultra') {
                this.addFlowers(
                    Math.sin(angle) * length,
                    startY + Math.cos(angle) * length,
                    0,
                    tree,
                    zAngle
                );
            }
        };
        
        // Add branches
        const branchCount = this.quality === 'ultra' ? 5 : 3;
        for (let i = 0; i < branchCount; i++) {
            const y = 3 + i * 0.5;
            const angle = Math.PI / 3 + (Math.random() - 0.5) * 0.2;
            const zAngle = Math.PI * 2 * (i / branchCount);
            
            addBranch(y, 1.5, 0.15, angle, zAngle);
        }
        
        // Foliage
        const foliageGeometry = new THREE.SphereGeometry(2, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x66bb6a,
            roughness: 0.8,
            metalness: 0.05
        });
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 5;
        foliage.castShadow = true;
        tree.add(foliage);
        
        // Add flowers throughout foliage
        if (this.quality === 'high' || this.quality === 'ultra') {
            const flowerCount = this.quality === 'ultra' ? 15 : 8;
            for (let i = 0; i < flowerCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 1.8;
                const y = 5 + (Math.random() - 0.5) * 1.5;
                
                this.addFlowers(
                    Math.cos(angle) * radius,
                    y,
                    Math.sin(angle) * radius,
                    tree
                );
            }
        }
        
        return tree;
    }
    
    addFlowers(x, y, z, parent, rotationY = 0) {
        const flowerCount = this.quality === 'ultra' ? 5 : 3;
        const flowerGroup = new THREE.Group();
        flowerGroup.position.set(x, y, z);
        flowerGroup.rotation.y = rotationY;
        
        for (let i = 0; i < flowerCount; i++) {
            // Flower center
            const centerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
            
            const center = new THREE.Mesh(centerGeometry, centerMaterial);
            
            // Position with slight offset
            const offsetX = (Math.random() - 0.5) * 0.3;
            const offsetY = (Math.random() - 0.5) * 0.3;
            const offsetZ = (Math.random() - 0.5) * 0.3;
            
            center.position.set(offsetX, offsetY, offsetZ);
            
            // Petals
            const petalCount = 5;
            const petalColor = Math.random() > 0.5 ? 0xec407a : 0xf48fb1; // Different pink shades
            
            for (let j = 0; j < petalCount; j++) {
                const angle = (j / petalCount) * Math.PI * 2;
                
                const petalGeometry = new THREE.CircleGeometry(0.15, 6);
                const petalMaterial = new THREE.MeshBasicMaterial({
                    color: petalColor,
                    side: THREE.DoubleSide
                });
                
                const petal = new THREE.Mesh(petalGeometry, petalMaterial);
                petal.position.copy(center.position);
                petal.position.x += Math.cos(angle) * 0.1;
                petal.position.z += Math.sin(angle) * 0.1;
                
                // Orient petal
                petal.lookAt(
                    petal.position.x + Math.cos(angle),
                    petal.position.y,
                    petal.position.z + Math.sin(angle)
                );
                
                flowerGroup.add(petal);
            }
            
            flowerGroup.add(center);
        }
        
        parent.add(flowerGroup);
    }
    
    setupSampleData() {
        // Generate initial sample followers
        this.generateSampleFollowers(50);
        
        // Update UI to reflect current count
        if (this.exactFollowerCount) {
            this.exactFollowerCount.value = this.followers.length;
        }
        
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
    
    addNewFollower() {
        const name = this.newFollowerInput.value.trim();
        
        if (name && name.length >= 3 && !this.followers.some(f => f.name.toLowerCase() === name.toLowerCase())) {
            this.followers.push({
                name: name,
                date: new Date().toISOString().slice(0, 10)
            });
            
            // Update UI
            if (this.exactFollowerCount) {
                this.exactFollowerCount.value = this.followers.length;
            }
            
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
                        if (this.exactFollowerCount) {
                            this.exactFollowerCount.value = this.followers.length;
                        }
                        
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
    
    // Edit follower name
    editFollowerName(index) {
        const follower = this.followers[index];
        
        // Create edit name dialog if it doesn't exist
        if (!document.getElementById('edit-name-dialog')) {
            const dialog = document.createElement('div');
            dialog.id = 'edit-name-dialog';
            dialog.className = 'edit-name-dialog';
            dialog.innerHTML = `
                <div class="edit-name-content">
                    <div class="edit-name-header">
                        <h3>Edit Follower Name</h3>
                        <button class="close-dialog-btn" id="close-edit-name-dialog">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <input type="text" id="edit-name-input" class="edit-name-input" placeholder="Enter new name...">
                    <div id="edit-name-validation" class="input-validation"></div>
                    <div class="edit-name-buttons">
                        <button class="edit-name-btn cancel-btn" id="cancel-edit-name">Cancel</button>
                        <button class="edit-name-btn save-btn" id="save-edit-name">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);
        }
        
        const dialog = document.getElementById('edit-name-dialog');
        const input = document.getElementById('edit-name-input');
        const validation = document.getElementById('edit-name-validation');
        const closeBtn = document.getElementById('close-edit-name-dialog');
        const cancelBtn = document.getElementById('cancel-edit-name');
        const saveBtn = document.getElementById('save-edit-name');
        
        // Set initial value
        input.value = follower.name;
        validation.style.display = 'none';
        
        // Show dialog
        dialog.classList.add('active');
        
        // Focus input
        input.focus();
        
        // Validation function
        const validateName = () => {
            const name = input.value.trim();
            
            if (name.length === 0) {
                validation.textContent = 'Name cannot be empty';
                validation.classList.add('error');
                validation.classList.remove('success');
                validation.style.display = 'block';
                saveBtn.disabled = true;
                return false;
            }
            
            if (name.length < 3) {
                validation.textContent = 'Name must be at least 3 characters';
                validation.classList.add('error');
                validation.classList.remove('success');
                validation.style.display = 'block';
                saveBtn.disabled = true;
                return false;
            }
            
            // Check for duplicates (excluding current follower)
            const isDuplicate = this.followers.some((f, i) => i !== index && f.name.toLowerCase() === name.toLowerCase());
            
            if (isDuplicate) {
                validation.textContent = 'This follower name already exists';
                validation.classList.add('error');
                validation.classList.remove('success');
                validation.style.display = 'block';
                saveBtn.disabled = true;
                return false;
            }
            
            validation.textContent = 'Valid name';
            validation.classList.add('success');
            validation.classList.remove('error');
            validation.style.display = 'block';
            saveBtn.disabled = false;
            return true;
        };
        
        // Event listeners
        input.addEventListener('input', validateName);
        
        const closeDialog = () => {
            dialog.classList.remove('active');
        };
        
        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);
        
        saveBtn.addEventListener('click', () => {
            if (validateName()) {
                // Update follower name
                follower.name = input.value.trim();
                
                // Update UI
                this.updateFollowersList();
                
                // Close dialog
                closeDialog();
            }
        });
        
        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !saveBtn.disabled) {
                saveBtn.click();
            }
        });
        
        // Initial validation
        validateName();
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
                    <button class="follower-btn edit" data-index="${originalIndex}" title="Edit name">
                        <i class="fas fa-edit"></i>
                    </button>
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
            const editBtn = li.querySelector('.edit');
            const locateBtn = li.querySelector('.locate');
            const deleteBtn = li.querySelector('.delete');
            
            editBtn.addEventListener('click', () => this.editFollowerName(originalIndex));
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
            // Hide followers panel
            if (this.followersPanel.style.display !== 'none') {
                this.toggleFollowersPanel();
            }
            
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
                    if (this.exactFollowerCount) {
                        this.exactFollowerCount.value = this.followers.length;
                    }
                    
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
                this.camera.position.add(direction.clone().multiplyScalar(speed));
            } else if (this.cameraControls.moveBackward) {
                this.camera.getWorldDirection(direction);
                this.camera.position.sub(direction.clone().multiplyScalar(speed));
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
        
        // Animate particle system
        if (this.particleSystem && this.particleData) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            const sizes = this.particleSystem.geometry.attributes.size.array;
            
            for (let i = 0; i < this.particleData.length; i++) {
                const particle = this.particleData[i];
                const idx = i * 3;
                
                // Calculate movement
                const offsetX = Math.sin(time * particle.speed + particle.phase) * particle.amplitude;
                const offsetY = Math.cos(time * particle.speed * 0.8 + particle.phase) * particle.amplitude * 0.5;
                const offsetZ = Math.sin(time * particle.speed * 0.5 + particle.phase + 1) * particle.amplitude;
                
                // Update position
                positions[idx] = particle.originalX + offsetX;
                positions[idx + 1] = particle.originalY + offsetY;
                positions[idx + 2] = particle.originalZ + offsetZ;
                
                // Pulse size
                sizes[i] = particle.size * (0.8 + Math.sin(time * 2 + particle.phase) * 0.2);
            }
            
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.geometry.attributes.size.needsUpdate = true;
        }
        
        // Add subtle wave animation to water
        if (this.lake) {
            this.lake.position.y = this.getTerrainHeightAtPosition(this.lake.position.x, this.lake.position.z) - 0.2 + Math.sin(time * 0.5) * 0.1;
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}
