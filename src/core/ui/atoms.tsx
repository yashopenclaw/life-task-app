import { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space } from '../theme';
export function Button({ title, onPress, tone = 'primary' }: { title: string; onPress: () => void; tone?: 'primary' | 'danger' | 'muted' | 'good' }) {
  const bg = tone === 'danger' ? colors.danger : tone === 'good' ? colors.good : tone === 'muted' ? 'rgba(255,255,255,0.06)' : colors.primary;
  const color = tone === 'muted' ? colors.soft : '#fff';
  if (Platform.OS === 'web') return <button onClick={onPress} style={{ backgroundColor: bg, color, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 13px', fontWeight: 700, marginRight: 8, marginTop: 8, cursor: 'pointer' }}>{title}</button> as never;
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, { backgroundColor: bg }]}><Text style={[styles.buttonText, { color }]}>{title}</Text></Pressable>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View>; }
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>; }
export function State({ loading, error, empty, retry }: { loading?: boolean; error?: string; empty?: string; retry?: () => void }) {
  return <View style={styles.state}>{loading ? <><ActivityIndicator color={colors.soft} /><Text style={styles.muted}>Loading...</Text></> : error ? <><Text style={styles.error}>{error}</Text>{retry ? <Button title="Retry" onPress={retry} /> : null}</> : <Text style={styles.muted}>{empty || 'Nothing here yet.'}</Text>}</View>;
}
export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'numeric' }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={[styles.input, multiline && styles.longInput]} value={value} onChangeText={onChangeText} placeholder={placeholder || label} placeholderTextColor="#62666d" multiline={multiline} keyboardType={keyboardType || 'default'} /></View>;
}
export function Row({ children }: { children: ReactNode }) { return <View style={styles.row}>{children}</View>; }
const styles = StyleSheet.create({
  button: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: radius.sm, alignSelf: 'flex-start', marginRight: space.sm, marginTop: space.sm, borderWidth: 1, borderColor: colors.line },
  buttonText: { fontWeight: '800', fontSize: 12 },
  card: { backgroundColor: 'rgba(255,255,255,0.025)', padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, marginBottom: space.md },
  section: { marginBottom: space.sm, marginTop: space.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  subtitle: { color: colors.muted, marginTop: 3, fontWeight: '600' },
  state: { padding: space.xl, alignItems: 'center', gap: space.sm },
  muted: { color: colors.muted },
  error: { color: colors.danger, fontWeight: '800' },
  field: { marginBottom: space.md },
  label: { color: colors.muted, fontWeight: '800', marginBottom: space.xs, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, backgroundColor: 'rgba(255,255,255,0.035)', color: colors.ink, fontWeight: '600' },
  longInput: { minHeight: 76, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
