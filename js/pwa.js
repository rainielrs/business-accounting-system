// PWA functionality
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.handleInstallPrompt();
        this.addInstallButton();
        this.checkPWAStatus();
    }

    // Register service worker with correct path
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Try different paths
                let registration;
                try {
                    registration = await navigator.serviceWorker.register('./sw.js');
                } catch (e) {
                    registration = await navigator.serviceWorker.register('/sw.js');
                }
                
                console.log('Service Worker registered successfully:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
                return registration;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                return null;
            }
        }
    }

    // Enhanced install prompt handling
    handleInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('beforeinstallprompt event fired');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
            
            // Also show in console for debugging
            console.log('Install prompt is ready');
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallButton();
            this.deferredPrompt = null;
        });
    }


    // Add install button to UI
    addInstallButton() {
        const installButton = document.createElement('button');
        installButton.id = 'install-button';
        installButton.innerHTML = '<i class="fas fa-download"></i> Install App';
        installButton.className = 'install-btn hidden';
        installButton.addEventListener('click', () => this.installApp());
        
        document.body.appendChild(installButton);
    }

    // Show install button
    showInstallButton() {
        const installButton = document.getElementById('install-button');
        if (installButton) {
            installButton.classList.remove('hidden');
            console.log('Install button shown');
        }
    }

    // Hide install button
    hideInstallButton() {
        const installButton = document.getElementById('install-button');
        if (installButton) {
            installButton.classList.add('hidden');
        }
    }

    // Install the app
    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            this.deferredPrompt = null;
            this.hideInstallButton();
        } else {
            this.showPWAInfo();
        }
    }

    // Check if app is running as PWA
    isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone ||
               document.referrer.includes('android-app://');
    }

    // Show update notification
    showUpdateNotification() {
        if (confirm('A new version is available. Would you like to update?')) {
            window.location.reload();
        }
    }

    // Enable offline functionality
    enableOfflineMode() {
        window.addEventListener('online', () => {
            this.showConnectionStatus('online');
        });

        window.addEventListener('offline', () => {
            this.showConnectionStatus('offline');
        });
    }

    // Show connection status
    showConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status') || this.createStatusElement();
        statusElement.textContent = status === 'online' ? 'Back online' : 'You are offline';
        statusElement.className = `connection-status ${status}`;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }

    // Create status element
    createStatusElement() {
        const statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'connection-status';
        document.body.appendChild(statusElement);
        return statusElement;
    }
}

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const pwaManager = new PWAManager();
    pwaManager.enableOfflineMode();
});