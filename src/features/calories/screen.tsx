import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Button, Card, Field, Row, SectionHeader, State } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
import { caloriesApi } from './api';
import type { NutritionEstimate } from './types';

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CaloriesScreen() {
  const { data, loading, error, load } = useAsync(useCallback(() => caloriesApi.list(), []));
  const [date, setDate] = useState(today());
  const [item, setItem] = useState('');
  const [calories, setCalories] = useState('');
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function estimateFood() {
    if (!item.trim() || estimating) return;
    setEstimating(true);
    setFormError('');
    try {
      const next = await caloriesApi.estimate(item.trim());
      setEstimate(next);
      setCalories(String(next.calories));
    } catch (err) {
      setFormError(errorText(err, 'Could not estimate nutrition. You can still enter calories manually.'));
    } finally {
      setEstimating(false);
    }
  }

  async function add() {
    const cleanItem = item.trim();
    if (!cleanItem || saving) return;
    setSaving(true);
    setFormError('');
    try {
      await caloriesApi.create({
        date,
        item: cleanItem,
        calories: Number(calories || estimate?.calories || 0),
        source: estimate ? 'ai' : 'manual',
        nutrition: estimate,
      });
      setItem('');
      setCalories('');
      setEstimate(null);
      await load();
    } catch (err) {
      setFormError(errorText(err, 'Could not save calorie entry.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await caloriesApi.remove(id);
    await load();
  }

  const grouped = useMemo(() => {
    const out: Record<string, typeof data> = {};
    (data || []).forEach(entry => { out[entry.date] = [...(out[entry.date] || []), entry]; });
    return out;
  }, [data]);

  if (loading) return <State loading />;
  if (error) return <State error={error} retry={load} />;

  return <ScrollView>
    <SectionHeader title="Add calories" subtitle="Type food → estimate nutrition → save the structured entry." />
    <Card>
      <Field label="Date" value={date} onChangeText={setDate} />
      <Field label="Food" value={item} onChangeText={(value) => { setItem(value); setEstimate(null); setFormError(''); }} placeholder="e.g. whey with oats and dahi" />
      <Row>
        <Button title={estimating ? 'Estimating…' : 'Estimate nutrition'} tone="good" onPress={estimateFood} />
        <Button title={saving ? 'Saving…' : 'Save'} onPress={add} />
      </Row>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      {estimate ? <View style={styles.estimate}>
        <View style={styles.estimateTop}>
          <Text style={styles.kicker}>{estimate.confidence} confidence</Text>
          <Text style={styles.serving}>{estimate.serving}</Text>
        </View>
        <Text style={styles.big}>{estimate.calories} cal</Text>
        <View style={styles.macroRow}>
          <Text style={styles.macroPill}>P {estimate.protein_g}g</Text>
          <Text style={styles.macroPill}>C {estimate.carbs_g}g</Text>
          <Text style={styles.macroPill}>F {estimate.fat_g}g</Text>
        </View>
        <Text style={styles.note}>{estimate.notes}</Text>
      </View> : <Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="numeric" />}
    </Card>

    {Object.keys(grouped).length === 0 ? <State empty="No calorie entries yet." /> : Object.entries(grouped).map(([day, items]) => {
      const total = (items || []).reduce((sum, entry) => sum + entry.calories, 0);
      return <View key={day}>
        <SectionHeader title={day} subtitle={`${total} calories`} />
        {(items || []).map(entry => <Card key={entry.id}>
          <Text style={styles.item}>{entry.item}</Text>
          <Text style={styles.entryMeta}>{entry.calories} cal · {entry.source}</Text>
          {entry.nutrition ? <Text style={styles.entryMacro}>P {entry.nutrition.protein_g}g · C {entry.nutrition.carbs_g}g · F {entry.nutrition.fat_g}g</Text> : null}
          <Row><Button title="Delete" tone="danger" onPress={() => remove(entry.id)} /></Row>
        </Card>)}
      </View>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  estimate: { marginTop: 12, padding: 16, borderRadius: 22, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
  estimateTop: { marginBottom: 4 },
  kicker: { color: '#a7f3d0', fontWeight: '900', textTransform: 'uppercase', fontSize: 11 },
  serving: { color: '#cbd5e1', fontWeight: '800', marginTop: 2 },
  big: { fontSize: 34, fontWeight: '900', color: '#fff', marginTop: 6 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  macroPill: { color: '#e0e7ff', backgroundColor: '#312e81', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginTop: 6, fontWeight: '900' },
  note: { color: '#cbd5e1', marginTop: 10, fontWeight: '700' },
  error: { color: colors.danger, fontWeight: '800', marginTop: 10 },
  item: { fontWeight: '900', fontSize: 16, color: colors.ink },
  entryMeta: { color: colors.muted, fontWeight: '800', marginTop: 4 },
  entryMacro: { color: colors.ink, fontWeight: '700', marginTop: 4 },
});
