import json

import pytest
import structlog

from cobra_collectors.log import configure_logging


def test_production_logs_are_json_lines(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging("production", "info")
    structlog.get_logger().info("collector finished", source="camara")

    event = json.loads(capsys.readouterr().err.strip())
    assert event["event"] == "collector finished"
    assert event["source"] == "camara"
    assert event["level"] == "info"
    assert "timestamp" in event


def test_events_below_level_are_dropped(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging("production", "warn")
    structlog.get_logger().info("hidden")
    structlog.get_logger().warning("shown")

    lines = capsys.readouterr().err.strip().splitlines()
    assert [json.loads(line)["event"] for line in lines] == ["shown"]
