import sys
import socket
import urllib
import os
#from urllib.request import urlopen --> module import error
# https://stackoverflow.com/questions/2792650/python3-error-import-error-no-module-name-urllib2
try:
    # For Python 3.0 and later
    from urllib.request import urlopen
except ImportError:
    # Fall back to Python 2's urllib2
    from urllib2 import urlopen
import subprocess
from time import sleep
import signal
import json
import re
import http

def get_command_msg(id):
	return "_GPHD_:%u:%u:%d:%1lf\n" % (0, 0, 2, 0)

## for wake_on_lan
GOPRO_IP = '10.10.10.98'
GOPRO_MAC = 'DEADBEEF0000'


def gopro_live():
	UDP_IP = "10.10.10.98"
	UDP_PORT = 8554
	KEEP_ALIVE_PERIOD = 2500
	KEEP_ALIVE_CMD = 2

	MESSAGE = get_command_msg(KEEP_ALIVE_CMD)
	try:
		response_raw = urlopen('http://10.10.10.98/gp/gpControl').read().decode('utf-8')
		jsondata=json.loads(response_raw)
		response=jsondata["info"]["firmware_version"]
	except urllib.error.URLError as e: 
		ResponseData = e.reason
		print("connection to 98 failed because of {0} exiting".format(ResponseData))
		sys.exit(0)
	if "HD4" in response or "HD3.2" in response or "HD5" in response or "HX" in response or "HD6" or "HD7" in response:
		urlopen("http://10.10.10.98/gp/gpControl/execute?p1=gpStream&a1=proto_v2&c1=restart").read()
		## GoPro HERO4 Session needs status 31 to be greater or equal than 1 in order to start the live feed.
		if "HX" in response:
			connectedStatus=False
			print("retryinig connection")
			while connectedStatus == False:
				req=urlopen("http://10.10.10.98/gp/gpControl/status")
				data = req.read()
				encoding = req.info().get_content_charset('utf-8')
				json_data = json.loads(data.decode(encoding))
				if json_data["status"]["31"] >= 1:
					connectedStatus=True
				print("-")
		subprocess.Popen("ffmpeg -i udp://10.10.10.10:10098 -fflags nobuffer -probesize 512  -c:v copy -b:v 5M -pix_fmt yuv420p -g 0 -an -f hls -hls_time 2 -hls_list_size 2 -hls_allow_cache 0 -hls_flags delete_segments /project/kiosk-app/streaming/gopro98_.m3u8", shell=True)
		#subprocess.Popen("ffmpeg -i 'udp://10.10.10.98:8555' -fflags nobuffer -f:v mpegts -probesize 8192 -an -vcodec copy /tmp/streaming/str", shell=True)
		#subprocess.Popen("ffmpeg -i 'udp://10.10.10.98:8555' -fflags nobuffer  -probesize 512 -b 2000k -minrate 2000k -maxrate 2000k  -an -c:v libx264 -tune zerolatency -g 0 -f hls -hls_time 2 -hls_list_size 2 -hls_flags delete_segments /project/kiosk-app/streaming/gopro.m3u8", shell=True)		
		if sys.version_info.major >= 3:
			MESSAGE = bytes(MESSAGE, "utf-8")
		print("\nRunning. Press ctrl+C to quit this application.\n")
		mtime=0	
		countcheck=0
		while True:
			if countcheck <8:
				try:
					stat = os.stat('/project/kiosk-app/streaming/gopro98_.m3u8')
					if stat.st_mtime != mtime:
						mtime=stat.st_mtime
						countcheck=0						
					else:						
						countcheck=countcheck+1
				except FileNotFoundError:				
					countcheck=countcheck+1
			else:
				print('Process hanged. Exiting')
				sys.exit(0)
			sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
			sock.sendto(MESSAGE, (UDP_IP, UDP_PORT))
			sleep(KEEP_ALIVE_PERIOD/1000)		

def quit_gopro(signal, frame):
	print("Exiting..")
	sys.exit(0)

def wake_on_lan(macaddress):
	"""switches on remote computers using WOL. """
	#check macaddress format and try to compensate
	if len(macaddress) == 12:
		pass
	elif len(macaddress) == 12 + 5:
		sep = macaddress[2]
		macaddress = macaddress.replace(sep, '')
	else:
		raise ValueError('Incorrect MAC Address Format')
	#Pad the sync stream
	data = ''.join(['FFFFFFFFFFFF', macaddress * 20])
	send_data = bytes.fromhex(data)
	# Broadcast to lan
	sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
	sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
	sock.sendto(send_data, (GOPRO_IP, 9))

if __name__ == '__main__':
	sleep(2) #in order not to start too often in FATAL cause
	wake_on_lan(GOPRO_MAC)
	signal.signal(signal.SIGINT, quit_gopro)
	#what is this??
	#urlopen('http://10.10.10.98/gp/gpControl/setting/62/5000000').read()
	print('cleaning')
	killemall = subprocess.Popen("rm -rf /project/kiosk-app/streaming/gopro98_*", shell=True)
	while killemall.poll() is None:
		pass				
	try:
		lsofret = subprocess.check_output("lsof -ti udp:8555", shell=True).decode('utf-8')
		if lsofret:
			killffmpeg = subprocess.Popen("kill -9 "+lsofret, shell=True)
			while killffmpeg.poll() is None:
				pass							
	except subprocess.CalledProcessError as e:
		pass	
	gopro_live()
