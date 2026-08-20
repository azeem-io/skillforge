from __future__ import annotations

import os
from typing import Any, Protocol


class ChatClient(Protocol):
    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]: ...


class DeepSeekClient:
    """
    DeepSeek is OpenAI-compatible, so the official SDK works with `base_url`
    swapped. Kept behind the ChatClient protocol so the agent can be tested
    without network access or a key.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self._api_key = api_key or os.environ.get("DEEPSEEK_API_KEY", "")
        self._base_url = base_url or os.environ.get(
            "DEEPSEEK_BASE_URL", "https://api.deepseek.com"
        )
        self._model = model or os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
        self._client = None

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    def _load(self):
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self._api_key, base_url=self._base_url)
        return self._client

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        if not self.configured:
            raise RuntimeError("DEEPSEEK_API_KEY is not set.")

        kwargs: dict[str, Any] = {"model": self._model, "messages": messages}
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        response = self._load().chat.completions.create(**kwargs)
        return response.choices[0].message.model_dump()
