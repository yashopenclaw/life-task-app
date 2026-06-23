import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Row, SectionHeader, State } from '../../core/ui/atoms';
import { NaturalCapture } from '../../core/ui/NaturalCapture';
import { colors } from '../../core/theme';
import { caloriesApi } from './api';
export default function CaloriesScreen() {
  const { data, loading, error, load } = useAsync(useCallback(() => caloriesApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState('');
  async function addNatural(message: string, source: 'typed' | 'voice') {
    setBusy(true); setParsed('');
    try { const res = await caloriesApi.natural(message, source); setParsed(JSON.stringify(res.parsed, null, 2)); await load(); }
    finally { setBusy(false); }
  }
  async function remove(id: string) { await caloriesApi.remove(id); await load(); }
  const grouped = useMemo(() => { const out: Record<string, typeof data> = {}; (data || []).forEach(entry => { out[entry.date] = [...(out[entry.date] || []), entry]; }); return out; }, [data]);
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;
  return <ScrollView>
    <SectionHeader title="Calories" subtitle="Just say what you ate. Today’s date is automatic." />
    <NaturalCapture title="What did you eat?" prompt="Example: ‘2 eggs and rice’ → AI-style nutrition JSON + saved entry." placeholder="Type or dictate food…" busy={busy} onSubmit={addNatural} />
    {parsed ? <Card><Text style={styles.json}>{parsed}</Text></Card> : null}
    {Object.keys(grouped).length === 0 ? <State empty="No calorie entries yet." /> : Object.entries(grouped).map(([day, items]) => {
      const total = (items || []).reduce((sum, entry) => sum + entry.calories, 0);
      return <View key={day}><SectionHeader title={day} subtitle={`${total} calories`} />{(items || []).map(entry => <Card key={entry.id}><Text style={styles.item}>{entry.item}</Text><Text style={styles.entryMeta}>{entry.calories} cal · {entry.source}</Text>{entry.nutrition ? <><Text style={styles.entryMacro}>P {entry.nutrition.protein_g}g · C {entry.nutrition.carbs_g}g · F {entry.nutrition.fat_g}g</Text><Text style={styles.note}>{entry.nutrition.serving}</Text></> : null}<Row><Button title="Delete" tone="danger" onPress={() => remove(entry.id)} /></Row></Card>)}</View>;
    })}
  </ScrollView>;
}
const styles = StyleSheet.create({ json: { fontFamily:'monospace', color:'#0f172a' }, item: { fontWeight: '900', fontSize: 16, color: colors.ink }, entryMeta: { color: colors.muted, fontWeight: '800', marginTop: 4 }, entryMacro: { color: colors.ink, fontWeight: '700', marginTop: 4 }, note: { color: colors.muted, marginTop: 4, fontWeight: '700' } });
