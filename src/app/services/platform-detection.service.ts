import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs';
import { Capacitor } from '@capacitor/core';

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';
export type Platform = 'android' | 'ios' | 'web';

export interface DeviceState {
  deviceType: DeviceType;
  orientation: Orientation;
  platform: Platform;
  isNative: boolean;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Platform Detection Service
 *
 * Detects device type (phone/tablet/desktop), orientation, and platform.
 * Provides both Observable streams and synchronous methods.
 *
 * Usage:
 * - Inject in component
 * - Subscribe to deviceState$ for reactive updates
 * - Or use synchronous methods: isPhone(), isTablet(), etc.
 */
@Injectable({
  providedIn: 'root'
})
export class PlatformDetectionService {

  // Observables for reactive updates
  public deviceState$: Observable<DeviceState>;
  public isPhone$: Observable<boolean>;
  public isTablet$: Observable<boolean>;
  public isDesktop$: Observable<boolean>;
  public isPortrait$: Observable<boolean>;
  public isLandscape$: Observable<boolean>;
  public deviceType$: Observable<DeviceType>;
  public orientation$: Observable<Orientation>;

  // Current state (synchronous access)
  private currentStateSubject: BehaviorSubject<DeviceState>;

  // Native platform info
  private nativePlatform: Platform = 'web';

  constructor(private breakpointObserver: BreakpointObserver) {
    // Detect native platform
    this.detectNativePlatform();

    // Create initial state
    const initialState = this.createDeviceState();
    this.currentStateSubject = new BehaviorSubject<DeviceState>(initialState);

    // Setup observables for device type detection
    const phoneObservable = this.breakpointObserver
      .observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape])
      .pipe(map(result => result.matches));

    const tabletObservable = this.breakpointObserver
      .observe([Breakpoints.TabletPortrait, Breakpoints.TabletLandscape])
      .pipe(map(result => result.matches));

    const webObservable = this.breakpointObserver
      .observe([Breakpoints.Web, Breakpoints.WebLandscape, Breakpoints.WebPortrait])
      .pipe(map(result => result.matches));

    const orientationObservable = this.breakpointObserver
      .observe('(orientation: portrait)')
      .pipe(map(result => result.matches));

    // Combine all observables to create unified device state
    this.deviceState$ = combineLatest([
      phoneObservable,
      tabletObservable,
      webObservable,
      orientationObservable
    ]).pipe(
      map(([isPhone, isTablet, isWeb, isPortrait]) => {
        let deviceType: DeviceType = 'desktop';
        if (isPhone) deviceType = 'phone';
        else if (isTablet) deviceType = 'tablet';

        const state: DeviceState = {
          deviceType,
          orientation: isPortrait ? 'portrait' : 'landscape',
          platform: this.nativePlatform,
          isNative: Capacitor.isNativePlatform(),
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight
        };

        // Update current state
        this.currentStateSubject.next(state);

        return state;
      }),
      distinctUntilChanged((prev, curr) =>
        prev.deviceType === curr.deviceType &&
        prev.orientation === curr.orientation
      )
    );

    // Individual observables
    this.isPhone$ = this.deviceState$.pipe(map(state => state.deviceType === 'phone'));
    this.isTablet$ = this.deviceState$.pipe(map(state => state.deviceType === 'tablet'));
    this.isDesktop$ = this.deviceState$.pipe(map(state => state.deviceType === 'desktop'));
    this.isPortrait$ = this.deviceState$.pipe(map(state => state.orientation === 'portrait'));
    this.isLandscape$ = this.deviceState$.pipe(map(state => state.orientation === 'landscape'));
    this.deviceType$ = this.deviceState$.pipe(map(state => state.deviceType));
    this.orientation$ = this.deviceState$.pipe(map(state => state.orientation));

    // Listen to window resize for screen dimensions updates
    window.addEventListener('resize', () => {
      const current = this.currentStateSubject.value;
      this.currentStateSubject.next({
        ...current,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      });
    });
  }

  /**
   * Detect native platform (Android, iOS, or Web)
   */
  private detectNativePlatform(): void {
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') {
      this.nativePlatform = platform;
    } else {
      this.nativePlatform = 'web';
    }
  }

  /**
   * Create device state snapshot
   */
  private createDeviceState(): DeviceState {
    const isPhone = this.breakpointObserver.isMatched([
      Breakpoints.HandsetPortrait,
      Breakpoints.HandsetLandscape
    ]);
    const isTablet = this.breakpointObserver.isMatched([
      Breakpoints.TabletPortrait,
      Breakpoints.TabletLandscape
    ]);
    const isPortrait = this.breakpointObserver.isMatched('(orientation: portrait)');

    let deviceType: DeviceType = 'desktop';
    if (isPhone) deviceType = 'phone';
    else if (isTablet) deviceType = 'tablet';

    return {
      deviceType,
      orientation: isPortrait ? 'portrait' : 'landscape',
      platform: this.nativePlatform,
      isNative: Capacitor.isNativePlatform(),
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };
  }

  // ==================== Synchronous Methods ====================

  /**
   * Check if current device is a phone
   */
  public isPhone(): boolean {
    return this.currentStateSubject.value.deviceType === 'phone';
  }

  /**
   * Check if current device is a tablet
   */
  public isTablet(): boolean {
    return this.currentStateSubject.value.deviceType === 'tablet';
  }

  /**
   * Check if current device is desktop
   */
  public isDesktop(): boolean {
    return this.currentStateSubject.value.deviceType === 'desktop';
  }

  /**
   * Get current device type
   */
  public getDeviceType(): DeviceType {
    return this.currentStateSubject.value.deviceType;
  }

  /**
   * Check if current orientation is portrait
   */
  public isPortrait(): boolean {
    return this.currentStateSubject.value.orientation === 'portrait';
  }

  /**
   * Check if current orientation is landscape
   */
  public isLandscape(): boolean {
    return this.currentStateSubject.value.orientation === 'landscape';
  }

  /**
   * Get current orientation
   */
  public getOrientation(): Orientation {
    return this.currentStateSubject.value.orientation;
  }

  /**
   * Check if running as native app
   */
  public isNativeApp(): boolean {
    return this.currentStateSubject.value.isNative;
  }

  /**
   * Check if running on Android
   */
  public isAndroid(): boolean {
    return this.currentStateSubject.value.platform === 'android';
  }

  /**
   * Check if running on iOS
   */
  public isIOS(): boolean {
    return this.currentStateSubject.value.platform === 'ios';
  }

  /**
   * Check if running on web
   */
  public isWeb(): boolean {
    return this.currentStateSubject.value.platform === 'web';
  }

  /**
   * Get current screen width
   */
  public getScreenWidth(): number {
    return this.currentStateSubject.value.screenWidth;
  }

  /**
   * Get current screen height
   */
  public getScreenHeight(): number {
    return this.currentStateSubject.value.screenHeight;
  }

  /**
   * Get current device state
   */
  public getCurrentState(): DeviceState {
    return this.currentStateSubject.value;
  }

  /**
   * Check if device should use mobile UI (phone or tablet)
   */
  public isMobile(): boolean {
    const deviceType = this.getDeviceType();
    return deviceType === 'phone' || deviceType === 'tablet';
  }

  /**
   * Get recommended button size based on device
   */
  public getRecommendedButtonSize(): 'small' | 'medium' | 'large' {
    const deviceType = this.getDeviceType();
    switch (deviceType) {
      case 'phone':
        return 'large'; // 60x60px minimum
      case 'tablet':
        return 'medium'; // 50x50px minimum
      case 'desktop':
        return 'small'; // 40x40px minimum
    }
  }

  /**
   * Get recommended canvas padding based on device
   */
  public getCanvasPadding(): number {
    const deviceType = this.getDeviceType();
    switch (deviceType) {
      case 'phone':
        return 10;
      case 'tablet':
        return 20;
      case 'desktop':
        return 40;
    }
  }
}
