from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Sequence

import gspread  # type: ignore
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
