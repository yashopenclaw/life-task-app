import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Card, SectionHeader, State } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { briefApi } from './api';

export default function BriefScreen(){
 const {data,loading,error,load}=useAsync(useCallback(()=>briefApi.latest(),[]));
 if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>; if(!data)return <State empty="No brief yet."/>;
 return <ScrollView><SectionHeader title="Latest brief" subtitle={data.generated_at}/><Card><Text style={styles.json}>{JSON.stringify(data.content,null,2)}</Text></Card></ScrollView>;
}

const styles = StyleSheet.create({
 json: { color: colors.soft, fontFamily: fonts.bodyMedium },
});
