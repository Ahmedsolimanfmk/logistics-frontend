import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from '@/lib/api';

export function usePushNotifications(isAuthenticated: boolean) {
  useEffect(() => {
    // Push Notifications only work on native devices (Android/iOS)
    if (!Capacitor.isNativePlatform() || !isAuthenticated) return;

    const registerPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('Push Notification permission denied');
          return;
        }

        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // Listen for the registration token
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          // Send token to backend
          try {
            await api.put('/users/me/fcm-token', { fcm_token: token.value });
            console.log('FCM Token synced to backend successfully.');
          } catch (error) {
            console.error('Failed to sync FCM Token to backend:', error);
          }
        });

        // Some issue with registration
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ' + JSON.stringify(notification));
          // In a real app, you could use a toast library like react-hot-toast here:
          // toast(notification.title + '\n' + notification.body);
        });

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed: ' + JSON.stringify(notification));
          // Handle navigation based on notification.data if needed
        });
      } catch (e) {
        console.error('Error registering push notifications', e);
      }
    };

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isAuthenticated]);
}
