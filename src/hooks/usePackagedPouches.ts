import { api } from '../lib/api'
import type { MachineCallResult } from './useMachineSim'

// Mirrors MachineService.PackagedMedItem/PackagedItem (NZP360's
// QueryPackagedInfo, ATDPS doc §3.7.1).
export type PackagedMedItem = {
  medCode?: string
  medNumber?: string
  nursingCode?: string
}

export type PackagedPouch = {
  packId?: string
  patId?: string
  exeTime?: string
  orderNo?: string
  orderPre?: string
  deptCode?: string
  medList: PackagedMedItem[]
}

export type QueryPackagedInfoResult = {
  ok: boolean
  message: string
  pouches: PackagedPouch[]
  queriedAt: string
}

// NZP360's QueryPackagedInfo/UpdatePackagedInfo pair plays the same role as
// RB1500's QueryReadyPrescription: detect which pouches have finished
// packaging, then let the pharmacist acknowledge/filter them — see
// MachineService.queryPackagedInfoFromNZP360/updatePackagedInfoOnNZP360.
export function usePackagedPouches() {
  const queryPackagedInfo = async (machineId = 1): Promise<QueryPackagedInfoResult> => {
    try {
      const result = await api.get<{
        ok: boolean
        message?: string
        pouches?: PackagedPouch[]
        queriedAt?: string
      }>(`/machine/query-packaged-info-nzp360?machineId=${machineId}`)

      return {
        ok: result.ok,
        message: result.message || (result.ok ? 'Fetched packaged pouches' : 'Machine rejected the request'),
        pouches: result.pouches ?? [],
        queriedAt: result.queriedAt ?? new Date().toISOString(),
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to reach dispensing machine',
        pouches: [],
        queriedAt: new Date().toISOString(),
      }
    }
  }

  const previewUpdatePackagedInfo = async (
    packIds: string[],
    machineId = 1,
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.post<{ xml: string }>('/machine/update-packaged-info-nzp360/preview', { machineId, packIds })
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  const updatePackagedInfo = async (packIds: string[], machineId = 1): Promise<MachineCallResult> => {
    try {
      const result = await api.post<{ ok: boolean; message?: string; raw?: string }>('/machine/update-packaged-info-nzp360', {
        machineId,
        packIds,
      })
      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Filtered ${packIds.length} pouch(es)` : 'Machine rejected the request'),
        raw: result.raw,
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to reach dispensing machine' }
    }
  }

  return { queryPackagedInfo, previewUpdatePackagedInfo, updatePackagedInfo }
}
