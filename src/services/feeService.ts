import { TuitionFeeConfiguration } from '../types';
import { fetchCollection, saveDoc } from './storage';

const DEFAULT_ID = 'default';

export async function getFeeConfigurations(): Promise<TuitionFeeConfiguration[]> {
  return fetchCollection<TuitionFeeConfiguration>('feeConfigurations');
}

export async function getFeeConfiguration(academicYear: string, semester: string): Promise<TuitionFeeConfiguration | null> {
  const all = await getFeeConfigurations();
  return all.find(item => item.academicYear === academicYear && item.semester === semester) || all.find(item => item.id === DEFAULT_ID) || null;
}

export async function saveFeeConfiguration(data: Omit<TuitionFeeConfiguration, 'id' | 'updatedAt'> & { id?: string }): Promise<TuitionFeeConfiguration> {
  const config: TuitionFeeConfiguration = {...data, id: data.id || DEFAULT_ID, updatedAt: new Date().toISOString()};
  await saveDoc('feeConfigurations', config.id, config);
  await saveDoc('feeConfigurationHistory', `${config.id}-${Date.now()}`, {...config, configurationId: config.id, action: 'updated'});
  return config;
}
