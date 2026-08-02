import { api } from '../lib/api'

// Mirrors MachineService.queryCobotTaskFromRB1500's response shape — only
// the flat identifying fields are parsed out, the rest (patient info, nested
// MedicineList) stays in innerXml.
export type QueryCobotTaskResult = {
  ok: boolean
  message: string
  taskNo?: string
  preHisId?: string
  preId?: string
  basketId?: string
  splitId?: string
  innerXml?: string
  queriedAt: string
}

export type UpdateCobotTaskResult = {
  ok: boolean
  message: string
  raw?: string
}

export function useCobotTask() {
  // Asks RB1500 which task this COBOT should work on next — read-only, no
  // database write on either side (see MachineService.queryCobotTaskFromRB1500).
  const fetchTask = async (machineId: number, cobotId: string): Promise<QueryCobotTaskResult> => {
    try {
      const result = await api.get<{
        ok: boolean
        message?: string
        taskNo?: string
        preHisId?: string
        preId?: string
        basketId?: string
        splitId?: string
        innerXml?: string
        queriedAt?: string
      }>(`/machine/query-cobot-task?machineId=${machineId}&cobotId=${encodeURIComponent(cobotId)}`)

      return {
        ok: result.ok,
        message: result.message || (result.ok ? 'Fetched COBOT task from machine' : 'Machine rejected the request'),
        taskNo: result.taskNo,
        preHisId: result.preHisId,
        preId: result.preId,
        basketId: result.basketId,
        splitId: result.splitId,
        innerXml: result.innerXml,
        queriedAt: result.queriedAt ?? new Date().toISOString(),
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to reach dispensing machine',
        queriedAt: new Date().toISOString(),
      }
    }
  }

  // Builds the exact SOAP body finishTask would transmit, without sending it —
  // lets the UI show a confirmation preview before the real machine call.
  const previewFinishTask = async (
    machineId: number,
    cobotId: string,
    taskNo: string,
  ): Promise<{ ok: true; xml: string } | { ok: false; message: string }> => {
    try {
      const result = await api.post<{ xml: string }>('/machine/update-cobot-task/preview', {
        machineId,
        cobotId,
        taskNo,
        taskState: 2,
        taskErrorId: 0,
        taskMessage: 'Successfully completed!',
      })
      return { ok: true, xml: result.xml }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to build preview' }
    }
  }

  // Tells RB1500 this COBOT finished the task (TaskState = 2, Process
  // complete) — this is what lets RB1500 carry the basket onward past the
  // COBOT station. No database write on either side (see
  // MachineService.updateCobotTaskOnRB1500).
  const finishTask = async (machineId: number, cobotId: string, taskNo: string): Promise<UpdateCobotTaskResult> => {
    try {
      const result = await api.post<{ ok: boolean; message?: string; raw?: string }>('/machine/update-cobot-task', {
        machineId,
        cobotId,
        taskNo,
        taskState: 2,
        taskErrorId: 0,
        taskMessage: 'Successfully completed!',
      })
      return {
        ok: result.ok,
        message: result.message || (result.ok ? `Marked task ${taskNo} as complete on the machine` : 'Machine rejected the request'),
        raw: result.raw,
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Failed to reach dispensing machine' }
    }
  }

  return { fetchTask, previewFinishTask, finishTask }
}
