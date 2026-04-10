(function initBudyRuntime(windowRef) {
  if (!windowRef) return;

  function getCapacitorBridge() {
    return windowRef.Capacitor || null;
  }

  function getNativePlatformFromCapacitor() {
    const bridge = getCapacitorBridge();
    if (!bridge) return '';

    try {
      if (typeof bridge.getPlatform === 'function') {
        const platform = String(bridge.getPlatform() || '').toLowerCase();
        if (platform === 'ios' || platform === 'android') return platform;
      }
    } catch (_) {}

    return '';
  }

  function isCapacitorNativePlatform() {
    const bridge = getCapacitorBridge();
    if (!bridge) return false;

    try {
      if (typeof bridge.isNativePlatform === 'function') {
        return Boolean(bridge.isNativePlatform());
      }
    } catch (_) {}

    const platform = getNativePlatformFromCapacitor();
    return platform === 'ios' || platform === 'android';
  }

  function detectPurchaseEnvironment() {
    const params = new URLSearchParams(windowRef.location.search || '');
    const forcedPlatform = String(params.get('purchasePlatform') || '').trim().toLowerCase();
    const ua = windowRef.navigator && windowRef.navigator.userAgent ? windowRef.navigator.userAgent : '';

    const capacitorPlatform = getNativePlatformFromCapacitor();
    const hasCapacitorNative = isCapacitorNativePlatform();

    const uaIsIOS = /iPhone|iPad|iPod/i.test(ua)
      || ((windowRef.navigator && windowRef.navigator.platform === 'MacIntel') && windowRef.navigator.maxTouchPoints > 1);
    const uaIsAndroid = /Android/i.test(ua);

    const hasNativeBridge = Boolean(windowRef.BudyNativePurchase && typeof windowRef.BudyNativePurchase.openPaywall === 'function')
      || Boolean(windowRef.webkit && windowRef.webkit.messageHandlers && windowRef.webkit.messageHandlers.budyPurchase && typeof windowRef.webkit.messageHandlers.budyPurchase.postMessage === 'function')
      || Boolean(windowRef.AndroidBridge && typeof windowRef.AndroidBridge.openPurchase === 'function')
      || Boolean(windowRef.ReactNativeWebView && typeof windowRef.ReactNativeWebView.postMessage === 'function');

    var platform = 'web';
    if (forcedPlatform === 'ios' || forcedPlatform === 'android') {
      platform = forcedPlatform;
    } else if (capacitorPlatform === 'ios' || capacitorPlatform === 'android') {
      platform = capacitorPlatform;
    } else if (uaIsIOS) {
      platform = 'ios';
    } else if (uaIsAndroid) {
      platform = 'android';
    }

    var usesNativeStore = forcedPlatform === 'ios'
      || forcedPlatform === 'android'
      || hasCapacitorNative
      || hasNativeBridge;

    return {
      platform: platform,
      usesNativeStore: usesNativeStore,
      hasNativeBridge: hasNativeBridge,
      hasCapacitorNative: hasCapacitorNative,
      isStandalone: Boolean(windowRef.matchMedia && windowRef.matchMedia('(display-mode: standalone)').matches) || windowRef.navigator.standalone === true,
      storeLabel: platform === 'ios' ? 'App Store' : platform === 'android' ? 'Google Play' : 'Stripe web checkout'
    };
  }

  function getUpgradeUrl() {
    var env = detectPurchaseEnvironment();
    if (!env.usesNativeStore) return '/checkout.html';
    if (env.platform === 'ios' || env.platform === 'android') {
      return '/my-account.html?purchasePlatform=' + env.platform;
    }
    return '/my-account.html';
  }

  windowRef.BudyRuntime = Object.assign({}, windowRef.BudyRuntime || {}, {
    detectPurchaseEnvironment: detectPurchaseEnvironment,
    getUpgradeUrl: getUpgradeUrl,
    isCapacitorNativePlatform: isCapacitorNativePlatform,
    getNativePlatformFromCapacitor: getNativePlatformFromCapacitor
  });
})(typeof window !== 'undefined' ? window : null);
