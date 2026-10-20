import socket

import pytest
from pytest_socket import SocketConnectBlockedError


@pytest.mark.filterwarnings("ignore:A test tried to use socket:UserWarning")
def test_external_connections_are_blocked() -> None:
    # IP literal of dadosabertos.camara.leg.br: no DNS lookup needed for the check.
    with pytest.raises(SocketConnectBlockedError):
        socket.create_connection(("200.219.133.191", 443), timeout=1)
