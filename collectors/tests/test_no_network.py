import socket

import pytest
from pytest_socket import SocketBlockedError


@pytest.mark.filterwarnings("ignore:A test tried to use socket:UserWarning")
def test_external_connections_are_blocked() -> None:
    with pytest.raises(SocketBlockedError):
        socket.create_connection(("dadosabertos.camara.leg.br", 443), timeout=1)
