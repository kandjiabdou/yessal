import React from 'react';
import { Image, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

type QRCodeProps = {
  value: string;
  size?: number;
  style?: object;
  color?: string; // hex without #, e.g. '00bf63'
};

/**
 * Lightweight QRCode component that uses a public QR rendering API as a zero-deps fallback.
 * - value: string to encode
 * - size: pixel size
 * - color: hex without `#` (default uses Colors.primary)
 *
 * Note: for a fully offline/native solution consider adding `react-native-qrcode-svg` or
 * a client-side generator. This implementation keeps the app dependency-free.
 */
export default function QRCode(props: Readonly<QRCodeProps>) {
  const { value, size = 120, style, color } = props;
  const hex = color ?? Colors.primary.replace('#', '');
  const uri = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}&color=${hex}`;

  // show an activity indicator while image loads
  const [loading, setLoading] = React.useState(true);

  return (
    <View style={[{ width: size, height: size }, style] as any}>
      {loading && (
        <View style={[styles.loader, { width: size, height: size }]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 8 }}
        onLoadEnd={() => setLoading(false)}
        accessibilityLabel="QR code"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
