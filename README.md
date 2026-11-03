# FINORA — Personal Finance Android

Starter project FINORA menggunakan HTML, CSS, dan JavaScript murni. Vite dan Capacitor hanya digunakan sebagai alat build dan pengemasan APK Android.

## Fitur yang sudah ada dalam starter ini
- Registrasi bebas dan login lokal (username/email + password).
- Password disimpan sebagai hash PBKDF2, bukan teks biasa.
- Data keuangan terpisah per akun pada IndexedDB perangkat.
- Dashboard total saldo, saldo tunai, saldo digital.
- Dompet tunai/digital dan transfer antar-dompet.
- Pencatatan pemasukan dan pengeluaran.
- Anggaran bulanan dan target tabungan.
- Catatan utang/piutang dan tagihan.
- Ekspor transaksi CSV, cetak/simpan laporan sebagai PDF melalui fitur cetak Android, serta backup/restore JSON.
- Dark Mode dan Light Mode.

## Catatan penting
Akun lokal hanya berlaku pada satu instalasi/perangkat. Ini bukan autentikasi server dan tidak menyinkronkan akun lintas perangkat. Jangan menganggap backup JSON terenkripsi; simpan file backup di lokasi aman. Penguncian biometrik/PIN dan penyempurnaan keamanan masih perlu ditambahkan sebelum penggunaan data sensitif.

## Persiapan build APK
Persyaratan: Node.js LTS, Android Studio, Android SDK, dan JDK yang sesuai dengan versi Android Gradle Plugin Capacitor.

```bash
npm install
npm run build
npx cap add android
npm run android:sync
npx cap open android
```

Di Android Studio:
1. Tunggu Gradle sync selesai.
2. Pilih **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. APK debug biasanya tersedia di `android/app/build/outputs/apk/debug/app-debug.apk`.

Untuk APK release, buat signing keystore sendiri melalui Android Studio dan simpan keystore serta password secara aman. Jangan unggah ke GitHub.

## Pengembangan
```bash
npm run dev
```


## Identitas visual dan ikon Android

- Logo aplikasi: `public/finora-logo.svg`
- Ikon Android sumber 1024x1024: `resources/icon.png`
- Logo juga digunakan pada halaman masuk dan header aplikasi.
- Saat membuat proyek Android di GitHub Actions, ikon PNG perlu disalin ke direktori `mipmap-*` Android sebelum proses Gradle.


## Kebijakan dependensi

Tidak menggunakan framework UI atau library fitur tambahan. Fungsi aplikasi memanfaatkan HTML, CSS, JavaScript, IndexedDB, Web Crypto API, Blob, dan fitur cetak browser. Vite, Capacitor, dan Android SDK tetap diperlukan untuk proses build APK.
