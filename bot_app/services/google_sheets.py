from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Sequence

import gspread  # type: ignore
from gspread.exceptions import CellNotFound  # type: ignore
from oauth2client.service_account import ServiceAccountCredentials  # type: ignore


class GoogleSheetsClient:
    def __init__(self, sheet_id: str, credentials_file: Path):
        self.sheet_id = sheet_id
        self.credentials_file = credentials_file
        self._scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive",
        ]

    def _client(self):
        credentials = ServiceAccountCredentials.from_json_keyfile_name(
            str(self.credentials_file), self._scope
        )
        return gspread.authorize(credentials)

    def append_row(self, values: Sequence[str]) -> None:
        sheet = self._client().open_by_key(self.sheet_id).sheet1
        sheet.append_row(list(values))

    async def append_row_async(self, values: Sequence[str]) -> None:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.append_row, values)

    def record_visit(self, username: str, user_id: str, timestamp: str) -> None:
        sheet = self._client().open_by_key(self.sheet_id).sheet1

        existing_cell = sheet.find(user_id, in_column=2)

        if existing_cell:
            row_values = sheet.row_values(existing_cell.row)
            target_column = max(len(row_values) + 1, 4)
            sheet.update_cell(existing_cell.row, target_column, timestamp)
            if username and (len(row_values) < 1 or not row_values[0]):
                sheet.update_cell(existing_cell.row, 1, username)
        else:
            sheet.append_row([username, user_id, "", timestamp])

    async def record_visit_async(self, username: str, user_id: str, timestamp: str) -> None:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.record_visit, username, user_id, timestamp)
