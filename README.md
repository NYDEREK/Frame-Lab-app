# Frame Lab Desktop

Frame Lab dla macOS i Windows. Aplikacja działa lokalnie, bez konta, e-maila i internetu. Kod aktywacyjny odblokowuje zakupiony plan. Rok liczy się od aktywacji; lifetime nie wygasa.

Osobny kod właścicielski aktywuje rolę **Developer**. Nie jest ona planem klienta: odblokowuje wszystkie funkcje i pokazuje lokalną zakładkę z sześcioma stałymi kodami planów, kopiowaniem kodu oraz pobieraniem prostego PDF-u aktywacyjnego.

## Projekty

- **New Project** tworzy projekt, a **Import Project** wczytuje plik. Lista projektów przewija się w obrębie okna. Przycisk **← Projects** nad narzędziami kreatora wraca do biblioteki.
- Zmiany zapisują się automatycznie; **Save project** oraz Cmd/Ctrl+S zapisują od razu.
- Przejście do innego projektu czeka na zapis. Przy błędzie projekt pozostaje otwarty.
- Przy zamykaniu z niezapisanymi zmianami można zapisać, odrzucić zmiany lub pozostać w programie.
- **Export project** zapisuje edytowalny plik `.framelab`. **Import project** otwiera go jako nową kopię. Plik nie zawiera licencji ani kodu aktywacyjnego.
- **3MF parts export** zapisuje części 3MF i szablon SVG soczewek.
- Limit wynosi 500 projektów. Po jego osiągnięciu nowe projekty są blokowane z komunikatem; nic nie jest automatycznie usuwane.

## Kopie i odzyskiwanie

Każdy udany zapis tworzy aktualną kopię sprawdzonej bazy. Program przechowuje też do 12 starszych migawek, tworzonych co najmniej 30 minut od poprzedniej migawki oraz przed usuwaniem, importem i przywracaniem projektów.

**File → Restore from backup…** odzyskuje projekty bez zastępowania obecnych projektów ani aktywacji. Zmienione wersje są dodawane jako kopie. Przy uszkodzeniu bazy program próbuje odtworzyć ją z poprawnej kopii i zachowuje uszkodzony oryginał. Jeśli nie ma poprawnej kopii, nie nadpisuje danych pustą biblioteką.

Kopie są na tym samym dysku. Nie chronią przed utratą komputera lub awarią dysku — ważne pliki `.framelab` warto kopiować na drugi nośnik.

Dane pozostają oddzielone od aplikacji i przetrwają aktualizację:

- macOS: `~/Library/Application Support/Frame Lab/data/`
- Windows: `%APPDATA%\Frame Lab\data\`

## Prace nad aplikacją

Node.js 24 i pnpm 11.19.0:

```sh
pnpm install
pnpm start
pnpm test
```

Testy działają na osobnych danych tymczasowych. Obejmują aktywację, limit, równoległe zapisy, kopie, import/eksport, eksport produkcyjny, błędy zapisu i ochronę zamykania.

```sh
pnpm dist:mac
pnpm dist:win
```

To instalatory testowe w `dist`. Podpisywanie opisuje [SIGNING.md](SIGNING.md). Bez certyfikatów `pnpm release:mac` i `pnpm release:win` blokują wydanie. Nic nie jest automatycznie publikowane.
