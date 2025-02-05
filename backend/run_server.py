import miniupnpc
import subprocess
import signal
import sys
import time
import requests
import socket

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't need to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def setup_upnp():
    upnp = miniupnpc.UPnP()
    upnp.discoverdelay = 10
    upnp.discover()
    upnp.selectigd()
    
    # Get your local IP
    local_ip = get_local_ip()
    
    # Add port mapping
    # Arguments: external_port, protocol, internal_host, internal_port, description, remote_host
    upnp.addportmapping(5000, 'TCP', local_ip, 5000, 'Connect4 Server', '')
    
    # Get and display your public IP
    public_ip = requests.get('https://api.ipify.org').text
    print(f"Server is running!")
    print(f"Your public IP: {public_ip}")
    print(f"Port: 5000")
    
    return upnp

def cleanup_upnp(upnp):
    try:
        upnp.deleteportmapping(5000, 'TCP')
        print("\nPort forwarding removed")
    except:
        print("\nFailed to remove port forwarding")

def run_server():
    try:
        # Setup port forwarding
        upnp = setup_upnp()
        
        # Start the Flask server
        server_process = subprocess.Popen(['python', 'app.py'])
        
        # Wait for keyboard interrupt
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down server...")
        # Kill the server process
        server_process.terminate()
        server_process.wait()
        
        # Clean up port forwarding
        cleanup_upnp(upnp)
        print("Server shutdown complete!")
        
if __name__ == "__main__":
    run_server()