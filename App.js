import { useState, useEffect, useRef } from 'react';
import { Text, View, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    // Configuração do canal de notificações no Android
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Permission not granted!');
      return '';
    }

    try {
      const { data: pushTokenString } = await Notifications.getExpoPushTokenAsync();
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e) {
      console.error('Error fetching token:', e);
      return '';
    }
  } else {
    console.warn('Must use physical device for push notifications');
    return '';
  }
}

async function sendTokenToBackend(token) {
  const backendUrl = 'http://192.168.0.19:3000/save-token'; // Substitua pela URL do seu backend

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Backend error:', error);
      throw new Error('Failed to send token to backend');
    }

    console.log('Token sent to backend successfully');
  } catch (error) {
    console.error('Error sending token to backend:', error);
  }
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(undefined);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        setExpoPushToken(token ?? '');
        if (token) {
          sendTokenToBackend(token); // Enviar o token ao backend
        }
      })
      .catch(error => console.error(error));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-around' }}>
      <Text>Your Expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Title: {notification?.request?.content?.title} </Text>
        <Text>Body: {notification?.request?.content?.body}</Text>
        <Text>Data: {notification?.request?.content?.data ? JSON.stringify(notification.request.content.data) : ''}</Text>
      </View>
    </View>
  );
}
