document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const contentContainer = document.getElementById('content-container');
    const navLinks = document.querySelectorAll('.nav-links a');

    // Toggle sidebar
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
        if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Handle navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('href').substring(1);
            
            // Load the page normally (remove the dashboard refresh logic)
            loadPage(page);
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Close sidebar on mobile
            sidebar.classList.remove('active');
        });
    });

    // Function to dynamically load and execute scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Remove existing script if it exists
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`Script loaded: ${src}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`Failed to load script: ${src}`);
                reject();
            };
            document.body.appendChild(script);
        });
    }

    // Function to clean up page-specific resources
    function cleanupPageResources() {
        // Clean up dashboard-specific resources
        if (window.dashboardManager) {
            delete window.dashboardManager;
        }
        if (window.dashboardInstance) {
            delete window.dashboardInstance;
        }

        // Clean up suppliers-specific resources
        if (window.suppliersManager) {
            delete window.suppliersManager;
        }
        if (window.SuppliersManager) {
            delete window.SuppliersManager;
        }

        // Clean up customers-specific resources
        if (window.customersManager) {
            delete window.customersManager;
        }
        if (window.CustomersManager) {
            delete window.CustomersManager;
        }

        // Clean up inventory-specific resources
        if (window.inventoryManager) {
            delete window.inventoryManager;
        }
        if (window.InventoryManager) {
            delete window.InventoryManager;
        }

        // Clean up returns-specific resources
        if (window.returnsManager) {
            delete window.returnsManager;
        }
        if (window.ReturnsManager) {
            delete window.ReturnsManager;
        }

        // Remove any dynamically added scripts
        const dynamicScripts = document.querySelectorAll('script[src^="js/"]:not([src="js/api.js"]):not([src="js/script.js"]):not([src="js/alerts.js"]):not([src="js/dashboard.js"])');
        dynamicScripts.forEach(script => script.remove());
    }

    // Load page content
    async function loadPage(page) {
        try {
            // Clean up previous page resources
            cleanupPageResources();

            let response;
            switch(page) {
                case 'dashboard':
                    response = await fetch('pages/dashboard.html');
                    break;
                case 'suppliers':
                    response = await fetch('pages/suppliers.html');
                    break;
                case 'customers':
                    response = await fetch('pages/customers.html');
                    break;
                case 'inventory':
                    response = await fetch('pages/inventory.html');
                    break;
                case 'returns':
                    response = await fetch('pages/returns.html');
                    break;
                case 'settings':
                    response = await fetch('pages/settings.html');
                    break;
                default:
                    response = await fetch('pages/dashboard.html');
            }

            if (response.ok) {
                const html = await response.text();
                contentContainer.innerHTML = html;

                // Load and initialize page-specific scripts
                if (page === 'dashboard') {
                    try {
                        // Clean up any existing dashboard instance
                        if (window.dashboardManager) {
                            delete window.dashboardManager;
                        }
                        if (window.dashboardInstance) {
                            delete window.dashboardInstance;
                        }
                        
                        // Initialize dashboard after HTML is loaded
                        setTimeout(() => {
                            if (window.Dashboard) {
                                console.log('Initializing dashboard manager...');
                                window.dashboardManager = new window.Dashboard();
                                window.dashboardInstance = window.dashboardManager;
                            } else {
                                console.error('Dashboard class not found');
                            }
                        }, 100);
                    } catch (error) {
                        console.error('Error initializing dashboard:', error);
                    }
                } else if (page === 'suppliers') {
                    try {
                        await loadScript('js/suppliers.js');
                        // Give a small delay to ensure script is fully loaded
                        setTimeout(() => {
                            if (window.SuppliersManager && !window.suppliersManager) {
                                console.log('Initializing suppliers manager...');
                                window.suppliersManager = new window.SuppliersManager();
                            }
                        }, 100);
                    } catch (error) {
                        console.error('Error loading suppliers script:', error);
                    }
                } else if (page === 'customers') {
                    try {
                        await loadScript('js/customers.js');
                        // Give a small delay to ensure script is fully loaded
                        setTimeout(() => {
                            if (window.CustomersManager && !window.customersManager) {
                                console.log('Initializing customers manager...');
                                window.customersManager = new window.CustomersManager();
                            }
                        }, 100);
                    } catch (error) {
                        console.error('Error loading customers script:', error);
                    }
                } else if (page === 'inventory') {
                    try {
                        await loadScript('js/inventory.js');
                        // Give a small delay to ensure script is fully loaded
                        setTimeout(() => {
                            if (window.InventoryManager && !window.inventoryManager) {
                                console.log('Initializing inventory manager...');
                                window.inventoryManager = new window.InventoryManager();
                            }
                        }, 100);
                    } catch (error) {
                        console.error('Error loading inventory script:', error);
                    }
                } else if (page === 'returns') {
                    try {
                        await loadScript('js/returns.js');
                        // Give a small delay to ensure script is fully loaded
                        setTimeout(() => {
                            if (window.ReturnsManager && !window.returnsManager) {
                                console.log('Initializing returns manager...');
                                window.returnsManager = new window.ReturnsManager();
                            }
                        }, 100);
                    } catch (error) {
                        console.error('Error loading returns script:', error);
                    }
                } else if (page === 'settings') {
                    try {
                        await loadScript('js/settings.js');
                        // Give a small delay to ensure script is fully loaded and then update counts
                        setTimeout(() => {
                            console.log('Settings page loaded, triggering count update...');
                            // Trigger the settings count update
                            if (window.refreshSettingsCounts) {
                                window.refreshSettingsCounts();
                            }
                            // Also dispatch the custom event
                            window.dispatchEvent(new Event('settingsPageLoaded'));
                        }, 200);
                    } catch (error) {
                        console.error('Error loading settings script:', error);
                    }
                }
                // Add other page-specific script loading here

            } else {
                contentContainer.innerHTML = '<h2>Page not found</h2>';
            }
        } catch (error) {
            console.error('Error loading page:', error);
            contentContainer.innerHTML = '<h2>Error loading page</h2>';
        }
    }

    // Load dashboard by default
    loadPage('dashboard');

    // Initialize inventory manager when inventory page is loaded
    if (typeof window.InventoryManager !== 'undefined') {
        window.inventoryManager = new window.InventoryManager();
    }
});
