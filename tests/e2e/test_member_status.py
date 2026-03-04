import pytest
import time
from playwright.sync_api import sync_playwright, expect, Page, BrowserContext

BASE = "http://localhost:3000"

@pytest.fixture(scope="module")
def browser_ctx():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()

def create_room(page: Page, name: str) -> str:
    page.goto(f"{BASE}/watch-party")
    page.wait_for_load_state("domcontentloaded")
    page.locator("button:has-text('Create Room')").wait_for(state="visible", timeout=15000)
    page.locator("button:has-text('Create Room')").click()
    page.wait_for_timeout(500)
    page.locator("input[placeholder='Your name']").fill(name)
    page.locator("button:has-text('Create')").click()
    page.wait_for_url("**/watch-party/**name=**", timeout=20000)
    code = page.url.split("/watch-party/")[1].split("?")[0]
    return code

def join_room(page: Page, code: str, name: str):
    page.goto(f"{BASE}/watch-party?join={code}")
    page.wait_for_load_state("domcontentloaded")
    page.locator("input[placeholder='Your name']").wait_for(state="visible", timeout=15000)
    page.locator("input[placeholder='Your name']").fill(name)
    page.locator("button:has-text('Join')").click()
    page.wait_for_url(f"**/watch-party/{code}**", timeout=20000)


class TestMemberStatusAndSignal:

    def test_host_sees_own_status_online(self, browser_ctx):
        """Host should see their own status as online after connecting"""
        ctx = browser_ctx.new_context(
            permissions=["microphone"],
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        code = create_room(page, "HostUser")
        page.wait_for_timeout(4000)

        status_text = page.locator("span.capitalize").first
        expect(status_text).to_be_visible(timeout=10000)
        text = status_text.text_content()
        assert text in ["online", "connecting"], f"Host status should be online or connecting, got: {text}"

        signal_svg = page.locator("svg[viewBox='0 0 16 16']").first
        expect(signal_svg).to_be_visible(timeout=5000)

        page.close()
        ctx.close()

    def test_member_status_text_valid(self, browser_ctx):
        """Member status text should show valid state"""
        ctx = browser_ctx.new_context(
            permissions=["microphone"],
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        code = create_room(page, "TestHost")
        page.wait_for_timeout(4000)

        statuses = page.locator("span.capitalize")
        count = statuses.count()
        assert count >= 1, "Should have at least 1 status text"
        for i in range(count):
            text = statuses.nth(i).text_content()
            assert text in ["online", "connecting", "offline"], f"Status text should be valid, got: {text}"

        page.close()
        ctx.close()

    def test_signal_bars_has_3_rects(self, browser_ctx):
        """Signal bars SVG should have 3 rect elements"""
        ctx = browser_ctx.new_context(
            permissions=["microphone"],
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        code = create_room(page, "SignalHost")
        page.wait_for_timeout(4000)

        signal_bars = page.locator("svg[viewBox='0 0 16 16']").first
        expect(signal_bars).to_be_visible(timeout=10000)

        rects = signal_bars.locator("rect")
        assert rects.count() == 3, f"Signal bars should have 3 rects, got {rects.count()}"

        page.close()
        ctx.close()

    def test_voice_bar_has_status_dots(self, browser_ctx):
        """Voice bar avatars should have status dot overlays"""
        ctx = browser_ctx.new_context(
            permissions=["microphone"],
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        code = create_room(page, "VoiceHost")
        page.wait_for_timeout(4000)

        avatars_with_dots = page.locator("div.relative:has(> div.w-7) > div.absolute")
        expect(avatars_with_dots.first).to_be_visible(timeout=10000)
        assert avatars_with_dots.count() >= 1, "Voice bar should have at least 1 status dot"

        page.close()
        ctx.close()

    @pytest.mark.skip(reason="Requires PeerJS cloud + fast Upstash Redis - flaky in headless/CI environments")
    def test_two_members_see_each_other_with_indicators(self, browser_ctx):
        """Two members should see each other with status and signal indicators"""
        ctx1 = browser_ctx.new_context(
            permissions=["microphone"],
            ignore_https_errors=True,
        )
        ctx2 = browser_ctx.new_context(
            permissions=["microphone"],
            ignore_https_errors=True,
        )

        host_page = ctx1.new_page()
        code = create_room(host_page, "Alice")
        host_page.wait_for_timeout(3000)

        guest_page = ctx2.new_page()
        join_room(guest_page, code, "Bob")

        expect(host_page.locator("span.capitalize").nth(1)).to_be_visible(timeout=30000)

        host_statuses = host_page.locator("span.capitalize")
        assert host_statuses.count() >= 2, f"Host should see 2 member statuses, got {host_statuses.count()}"

        guest_statuses = guest_page.locator("span.capitalize")
        expect(guest_statuses.nth(1)).to_be_visible(timeout=30000)
        assert guest_statuses.count() >= 2, f"Guest should see 2 member statuses, got {guest_statuses.count()}"

        host_signals = host_page.locator("svg[viewBox='0 0 16 16']")
        assert host_signals.count() >= 2, f"Host should see 2 signal bars, got {host_signals.count()}"

        guest_signals = guest_page.locator("svg[viewBox='0 0 16 16']")
        assert guest_signals.count() >= 2, f"Guest should see 2 signal bars, got {guest_signals.count()}"

        host_page.close()
        guest_page.close()
        ctx1.close()
        ctx2.close()

    def test_host_transitions_to_online(self, browser_ctx):
        """Host should transition from connecting to online"""
        ctx = browser_ctx.new_context(
            permissions=["microphone"],
            ignore_https_errors=True,
        )
        page = ctx.new_page()

        create_room(page, "TransUser")

        status = page.locator("span.capitalize").first
        expect(status).to_be_visible(timeout=10000)

        page.wait_for_timeout(5000)
        final_status = status.text_content()
        assert final_status == "online", f"After PeerJS connects, status should be 'online', got: {final_status}"

        page.close()
        ctx.close()
