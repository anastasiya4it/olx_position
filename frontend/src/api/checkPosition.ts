import axios from 'axios';
import type { CheckPositionRequest, CheckPositionResponse } from '../types';

const API_BASE = 'http://localhost:3000/api';

export async function checkPosition(
  payload: CheckPositionRequest
): Promise<CheckPositionResponse> {
  const { data } = await axios.post<CheckPositionResponse>(
    `${API_BASE}/check-position`,
    payload
  );
  return data;
}
