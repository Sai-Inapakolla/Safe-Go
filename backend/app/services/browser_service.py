from __future__ import annotations
import asyncio
import os
from typing import List, Dict, Any, Optional, cast
from playwright.async_api import async_playwright, Browser, Page, Playwright

class BrowserOperator:
    _instance: Optional[BrowserOperator] = None
    _browser: Optional[Browser] = None
    _playwright: Optional[Playwright] = None

    def __init__(self):
        pass

    @classmethod
    async def get_instance(cls) -> BrowserOperator:
        if cls._instance is None:
            cls._instance = BrowserOperator()
        return cast(BrowserOperator, cls._instance)

    async def _ensure_browser(self) -> bool:
        try:
            if self._playwright is None:
                self._playwright = await async_playwright().start()
            
            if self._browser is None and self._playwright:
                self._browser = await self._playwright.chromium.launch(headless=False)
            return self._browser is not None
        except Exception as e:
            print(f"[Browser Init Error] {e}")
            return False

    async def execute_plan(self, plan: List[Dict[str, Any]]) -> str:
        """
        Executes a sequence of browser actions.
        Each step in plan should have a 'type'.
        Supported: navigate, type, click, press, wait, scroll.
        """
        initialized = await self._ensure_browser()
        if not initialized or not self._browser:
            return "Failed to initialize browser."

        context = await self._browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page: Page = await context.new_page()
        
        try:
            for step in plan:
                action = step.get("type", "").lower()
                print(f"[Browser] Executing: {action}")
                
                if action == "navigate":
                    url = step.get("url")
                    if url:
                        await page.goto(url, wait_until="networkidle", timeout=30000)
                
                elif action == "type":
                    selector = step.get("selector")
                    value = step.get("value", "")
                    if selector:
                        await page.fill(selector, value)
                
                elif action == "click":
                    selector = step.get("selector")
                    if selector:
                        await page.click(selector, timeout=10000)
                
                elif action == "press":
                    selector = step.get("selector") or "body"
                    key = step.get("key", "Enter")
                    await page.press(selector, key)
                
                elif action == "wait":
                    ms = step.get("ms", 2000)
                    await asyncio.sleep(ms / 1000)
                
                elif action == "scroll":
                    direction = step.get("direction", "down")
                    if direction == "down":
                        await page.evaluate("window.scrollBy(0, 500)")
                    else:
                        await page.evaluate("window.scrollBy(0, -500)")
            
            final_title = await page.title()
            final_url = page.url
            return f"Successfully completed operations. Current page: '{final_title}' at {final_url}"

        except Exception as e:
            print(f"[Browser Error] {str(e)}")
            return f"Operation failed: {str(e)}"
        finally:
            await page.close()
            await context.close()

    async def shutdown(self):
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
