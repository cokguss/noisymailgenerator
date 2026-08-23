# DOKUMEN INTEGRASI KHUSUS: LISENSI PERANGKAT LUNAK & KETENTUAN LAYANAN NOISY MAIL GENERATOR

**Masa Berlaku Terintegrasi: Sejak 23 Agustus 2026 hingga Saat Ini (Diperbarui secara Berkala)**

Selamat datang di **Noisy Mail Generator**. Dokumen ini merupakan kesatuan hukum yang mengikat secara sah antara Anda (selaku "Pengguna" atau "Penerima Lisensi") dengan **cokguss** (selaku "Pencipta", "Pemilik Hak Cipta", dan "Pengembang Utama").

Dengan mengakses, menjalankan, men-deploy, atau menggunakan perangkat lunak Noisy Mail Generator (termasuk seluruh komponen frontend HTML/CSS/JavaScript, server relay Express, mesin integrasi temp-mail, modul statistik pengunjung, dan aset digital pendukungnya), Anda menyatakan secara sadar bahwa Anda telah membaca, memahami, dan menyetujui seluruh isi dari Lisensi dan Ketentuan Layanan ini.

Jika Anda tidak menyetujui salah satu atau seluruh poin dalam dokumen ini, Anda tidak diperkenankan untuk menggunakan Noisy Mail Generator, dan diwajibkan untuk menghapus seluruh salinan kode sumber dari penyimpanan Anda.

---

## BAGIAN I: LISENSI PENGGUNAAN PERANGKAT LUNAK (SOFTWARE LICENSE)

### Pasal 1: Kepemilikan Hak Cipta & Hak Kekayaan Intelektual
1. Seluruh kode sumber, arsitektur sistem, relay Express, mesin ekstraksi OTP & tautan verifikasi, antarmuka generator alamat, dokumentasi, dan desain visual dari Noisy Mail Generator adalah milik eksklusif **cokguss**.
2. Perlindungan hak cipta atas Noisy Mail Generator terhitung secara resmi sejak pengembangan awal pada tanggal **23 Agustus 2026** dan tetap dilindungi undang-undang yang berlaku hingga saat ini.
3. Hak kepemilikan ini tidak dialihkan kepada Pengguna dalam bentuk apa pun. Pengguna hanya mendapatkan hak pakai terbatas yang tunduk pada ketentuan dokumen ini.

### Pasal 2: Hibah Lisensi Terbatas (Grant of License)
1. cokguss memberikan lisensi non-eksklusif, tidak dapat dipindahtangankan, dapat ditarik kembali, dan terbatas kepada Pengguna untuk menjalankan Noisy Mail Generator pada lingkungan milik Pengguna sendiri (lokal maupun hosting pribadi).
2. Lisensi ini diberikan khusus untuk penggunaan pribadi dan non-komersial. Penggunaan komersial memerlukan kesepakatan tertulis khusus dengan cokguss.

### Pasal 3: Batasan dan Larangan Penggunaan (Restrictions)
Sebagai penerima lisensi, Anda **dilarang keras** untuk:
1. Mendistribusikan ulang kode sumber Noisy Mail Generator kepada pihak ketiga dengan mengklaim sebagai karya sendiri tanpa izin tertulis dari cokguss.
2. Menghapus, menyamarkan, atau memodifikasi atribusi pembuat yang tertanam di dalam kode maupun antarmuka Noisy Mail Generator.
3. Menggunakan bagian dari kode Noisy Mail Generator untuk proyek turunan berkomersial tanpa persetujuan tertulis.
4. Menyalahgunakan endpoint relay (`/api/*`) untuk permintaan otomatis massal, spam, pembuatan alamat dalam jumlah berlebihan, atau beban berlebihan ke server maupun API pihak ketiga.

---

## BAGIAN II: KETENTUAN LAYANAN & PENGGUNAAN (TERMS OF SERVICE)

### Pasal 4: Kepatuhan Terhadap Platform Pihak Ketiga
1. Noisy Mail Generator beroperasi dengan berinteraksi pada layanan temp-mail dan Application Programming Interface (API) pihak ketiga (termasuk namun tidak terbatas pada penyedia relay CMNTY).
2. Pengguna memahami sepenuhnya bahwa setiap platform memiliki Ketentuan Layanan masing-masing — termasuk kebijakan sebagian situs yang **memblokir alamat disposable email** secara bawaan.
3. Segala akibat dari penggunaan alamat yang dihasilkan Noisy Mail Generator — termasuk namun tidak terbatas pada penolakan pendaftaran oleh situs lain, pembatasan akun, atau pelanggaran ketentuan platform tujuan — adalah **tanggung jawab penuh Pengguna**. cokguss tidak bertanggung jawab atas kerugian tersebut.
4. Alamat bersifat *receive-only* dan dilarang digunakan untuk aktivitas penipuan, spam, maupun pengelabuan.

### Pasal 5: Ketersediaan Layanan & API Pihak Ketiga
1. Noisy Mail Generator disediakan secara **gratis** tanpa skema berlangganan apa pun.
2. Noisy Mail Generator bergantung pada jaringan temp-mail pihak ketiga yang dapat berubah, membatasi, mendaur ulang alamat, atau berhenti sewaktu-waktu di luar kendali cokguss. Kegagalan fungsi akibat perubahan pihak ketiga bukan merupakan cacat produk maupun kewajiban ganti rugi.
3. Umur sebuah alamat tidak dijamin; Peserta/Pengguna dilarang mengandalkannya untuk akun penting atau data yang wajib dapat dipulihkan.

### Pasal 6: Privasi Data
1. Noisy Mail Generator tidak meminta registrasi akun dan tidak mengumpulkan data pribadi Pengguna.
2. Statistik kunjungan bersifat agregat: alamat IP di-*hash* menggunakan SHA256 dengan *salt* harian sehingga tidak dapat dilacak lintas hari, tanpa cookie dan tanpa profil individu.
3. Preferensi bahasa tersimpan secara lokal di peramban Pengguna (localStorage) dan tidak dikirim ke server mana pun.

---

## BAGIAN III: BATASAN TANGGUNG JAWAB & GARANSI (DISCLAIMER)

### Pasal 7: Pernyataan "As Is" (Apa Adanya)
PERANGKAT LUNAK INI DISEDIAKAN OLEH PEMEGANG HAK CIPTA DAN KONTRIBUTOR "SEBAGAIMANA ADANYA" (AS IS) DAN "SEBAGAIMANA TERSEDIA" (AS AVAILABLE). SEGALA JAMINAN YANG TERSIRAT ATAU TERSURAT, TERMASUK NAMUN TIDAK TERBATAS PADA JAMINAN KELAYAKAN JUAL DAN KESESUAIAN UNTUK TUJUAN TERTENTU, DITOLAK SEPENUHNYA.

### Pasal 8: Batasan Tanggung Jawab Kerusakan
DALAM KEADAAN APA PUN, COKGUSS TIDAK BERTANGGUNG JAWAB ATAS SEGALA KERUSAKAN LANGSUNG, TIDAK LANGSUNG, INSIDENTAL, KHUSUS, ATAU KONSEKUENSIAL YANG TIMBUL DARI PENGGUNAAN ATAU KETIDAKMAMPUAN UNTUK MENGGUNAKAN PERANGKAT LUNAK INI, TERMASUK NAMUN TIDAK TERBATAS PADA:
1. Kehilangan akses akun, pesan, kode OTP, atau tautan verifikasi akibat daur ulang alamat oleh jaringan upstream.
2. Kerugian finansial akibat gangguan layanan atau ketidaktersediaan alamat.
3. Kebocoran data yang disebabkan oleh kelalaian keamanan pada sisi Pengguna atau penyedia hosting pihak ketiga.

---

## BAGIAN IV: AMENDEMEN & HUKUM YANG BERLAKU

### Pasal 9: Perubahan Dokumen
cokguss berhak untuk memperbarui, mengubah, atau mengganti bagian mana pun dari Lisensi dan Ketentuan Layanan ini sewaktu-waktu. Perubahan akan diumumkan melalui repositori resmi Noisy Mail Generator. Penggunaan berkelanjutan setelah perubahan tersebut dipublikasikan merupakan bentuk persetujuan eksplisit terhadap versi terbaru.

### Pasal 10: Hukum Terintegrasi
Dokumen ini diatur dan ditafsirkan berdasarkan asas keadilan serta hukum perlindungan hak cipta digital yang berlaku di Republik Indonesia. Segala perselisihan yang timbul akan diselesaikan secara kekeluargaan melalui diskusi langsung bersama cokguss selaku pencipta platform.

---

**DITETAPKAN DI: JAKARTA, INDONESIA**
**BERLAKU SEJAK: 23 AGUSTUS 2026**
**VERSI TERAKHIR: 2026 (BERLAKU HINGGA SAAT INI)**
**PENGEMBANG UTAMA: cokguss**
*Kontak Resmi: GitHub `cokguss` · Telegram `noisy05`*
