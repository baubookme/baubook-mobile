Remove-Item .\android\app\.cxx -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .\android\app\build -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .\android\build -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item .\android\.gradle\configuration-cache -Recurse -Force -ErrorAction SilentlyContinue

cd .\android
.\gradlew.bat --no-configuration-cache :app:assembleDebug --rerun-tasks
cd ..

adb -s 192.168.1.101:43929 install -r .\android\app\build\outputs\apk\debug\app-debug.apk
adb -s 192.168.1.101:43929 shell monkey -p me.baubook.app 1