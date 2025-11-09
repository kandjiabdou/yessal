import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import QRCode from '@/components/ui/QRCode';

export default function AccueilScreen() {
  // Fake data matching the screenshot
  const cardNumber = 'TH98059DIO';
  const washes = 1;
  const totalWeight = '6 kg';
  const credit = '0 FCFA';
  const points = 4;
  const pointsGoal = 40;

  const progress = Math.min(1, points / pointsGoal);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Programme de fidélité</ThemedText>

      <ThemedView style={styles.cardLarge}>
        <View style={styles.cardLargeRow}>
          <ThemedText style={styles.cardNumber}>{cardNumber}</ThemedText>
          <View style={styles.menuBox}>
            <IconSymbol name="creditcard.fill" size={18} color="#fff" />
          </View>
        </View>

        <View style={styles.qrWrapper}>
          <QRCode value={`loyalty:${cardNumber}`} size={110} />
        </View>
      </ThemedView>

      <View style={styles.row}> 
        <ThemedView style={[styles.smallBox, styles.boxGreen]}>
          <ThemedText style={styles.smallTitle}>lavages</ThemedText>
          <ThemedText style={styles.smallValue}>{washes}</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.smallBox, styles.boxBlue]}>
          <ThemedText style={styles.smallTitle}>Poids total</ThemedText>
          <ThemedText style={styles.smallValue}>{totalWeight}</ThemedText>
        </ThemedView>
      </View>

      <ThemedText type="subtitle" style={{ marginTop: 12, marginBottom: 8 }}>Fidélité</ThemedText>

      <ThemedView style={[styles.creditBox]}>
        <ThemedText style={styles.creditLabel}>Crédit disponible</ThemedText>
        <ThemedText style={styles.creditValue}>{credit}</ThemedText>
      </ThemedView>

      <ThemedView style={[styles.nextBox]}>
        <ThemedText style={styles.nextTitle}>Prochaine fidélité</ThemedText>
        <ThemedText style={styles.nextSmall}>{points}/{pointsGoal} pts</ThemedText>
        <ThemedView style={styles.progressBackgroundLight}>
          <ThemedView style={[styles.progressFillLight, { width: `${progress * 100}%` }]} />
        </ThemedView>
        <ThemedText style={styles.nextNote}>Plus que {pointsGoal - points} pts pour gagner 2000 FCFA de crédit</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 12,
  },
  cardLarge: {
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#f3fff9',
    borderWidth: 1,
    borderColor: '#dff5e8',
    marginBottom: 12,
  },
  cardLargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  cardSmallLabel: {
    color: Colors.icon,
    marginBottom: 6,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f5132',
  },
  menuBox: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#fff',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  smallBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  boxGreen: {
    backgroundColor: '#f3fff9',
    borderColor: '#dff5e8',
    marginRight: 8,
  },
  boxBlue: {
    backgroundColor: '#f0fbff',
    borderColor: '#dff7fb',
    marginLeft: 8,
  },
  smallTitle: {
    color: Colors.icon,
    marginBottom: 6,
  },
  smallValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f5132',
  },
  creditBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0fbff',
    borderWidth: 1,
    borderColor: '#dbeffd',
    marginBottom: 12,
  },
  creditLabel: {
    color: Colors.icon,
    marginBottom: 6,
  },
  creditValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f3a66',
  },
  pointsBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f6fff9',
    borderWidth: 1,
    borderColor: '#e6f8ea',
    marginBottom: 12,
  },
  pointsLabel: {
    color: Colors.icon,
    marginBottom: 6,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f5132',
    marginBottom: 8,
  },
  pointsNoteBox: {
    backgroundColor: '#e9fff3',
    padding: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pointsNote: {
    color: '#2a7a4b',
    fontSize: 12,
  },
  progressBackground: {
    height: 8,
    width: '100%',
    backgroundColor: '#e9f6ee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  nextBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff7ec',
    borderWidth: 1,
    borderColor: '#f4e3c7',
    marginBottom: 24,
  },
  nextTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  nextSmall: {
    marginBottom: 8,
    color: Colors.icon,
  },
  progressBackgroundLight: {
    height: 10,
    width: '100%',
    backgroundColor: '#fff2d9',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillLight: {
    height: '100%',
    backgroundColor: '#f6b84b',
  },
  nextNote: {
    color: '#8a5a17',
    fontSize: 13,
  },
});
