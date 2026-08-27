# Sigorta Takip

Kesilen poliçelerin partaj, branş, prim, vergi ve fon takibi. Excel defterinin yerini alan, Vercel’de yayınlanmaya hazır Next.js uygulaması.

## Ne işe yarar?

- Yeni poliçede **partaj** ve **branş adı** seçilir (listede yoksa anında eklenir).
- Branşa göre prim dökümü otomatik hesaplanır:
  - **Trafik:** G.H.K. payı %2, T.H.G. fonu %5, gider vergisi %5. Ek teminat varsa GHK/THGF yalnızca ZMSS neti üzerinden alınır.
  - **Kasko / İMM / yeşil kart:** gider vergisi %5.
  - **Konut:** gider vergisi %5 + Y.S.V. (yangın priminin %10’u).
  - **DASK / TSS / seyahat:** net = brüt.
- Raporlarda partaj, branş, tali ve ay kırılımında net, vergi, fon, brüt ve komisyon toplamları.
- Mevcut `KESİLEN POLİÇELERİN TÜMÜ` Excel dosyası içe aktarılır; yedek Excel olarak dışa aktarılır.
- Yenileme ekranı vadesi yaklaşan poliçeleri listeler.

Veriler tarayıcıdaki IndexedDB’de tutulur (T.C. ve müşteri bilgileri GitHub’a yazılmaz). Vercel’e aldıktan sonra Excel’i bir kez yüklemeniz yeterlidir; yedek için Ayarlar → Excel yedek al.

## Yerelde çalıştırma

```bash
npm install
npm test
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açılır.

## Vercel’e yayınlama

1. Bu repoyu GitHub’a itin (`main` veya bu dal).
2. [vercel.com/new](https://vercel.com/new) üzerinden GitHub reposunu bağlayın.
3. Framework: Next.js. Build `npm run build`, çıktı Next varsayılanıdır.
4. Deploy. Ortam değişkeni gerekmez.

İlk açılışta **Excel’i yükle** ile 2025–2026 defterinizi aktarın, ardından yeni işleri siteden girin.

## Prim örnekleri

Trafik, ZMSS neti 5.199 TL ve toplam net 5.804,81 TL:

| Kalem | Tutar |
| --- | ---: |
| Toplam net prim | 5.804,81 |
| G.H.K. payı (%2 × 5.199) | 103,98 |
| Gider vergisi (%5 × 5.804,81) | 290,24 |
| T.H.G. fonu (%5 × 5.199) | 259,95 |
| Brüt prim | 6.458,98 |

Kasko net 15.340,66 TL → gider vergisi 767,03 TL → brüt 16.107,69 TL.
