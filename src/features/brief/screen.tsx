import { useCallback } from 'react';
import { ScrollView, Text } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { Card, SectionHeader, State } from '../../core/ui/atoms';
import { briefApi } from './api';
export default function BriefScreen(){ const {data,loading,error,load}=useAsync(useCallback(()=>briefApi.latest(),[])); if(loading)return <State loading/>; if(error)return <State error={error} retry={load}/>; if(!data)return <State empty="No brief yet."/>; return <ScrollView><SectionHeader title="Latest brief" subtitle={data.generated_at}/><Card><Text style={{fontFamily:'monospace'}}>{JSON.stringify(data.content,null,2)}</Text></Card></ScrollView>; }
