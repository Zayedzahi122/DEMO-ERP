$rep='C:\Users\Service-Riyalo\Downloads\demo\demo\src\main'
Write-Output '=== 1) schema.sql / data.sql — products columns ==='
Get-ChildItem -LiteralPath $rep -Recurse -Include 'schema.sql','data.sql' -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Output "-- $($_.Name) --"
  Select-String -LiteralPath $_.FullName -Pattern 'create table products|created|timestamp|_at' | ForEach-Object { "L$($_.LineNumber): $($_.Line.Trim())" }
}
Write-Output ''
Write-Output '=== 2) ProductService.create body ==='
$svc = Get-ChildItem -LiteralPath $rep -Recurse -Filter 'ProductService.java' | Select-Object -First 1
$lines = Get-Content -LiteralPath $svc.FullName
for ($i = 26; $i -le 68; $i++) { $n = $i + 1; "{0,3}: {1}" -f $n, $lines[$i] }
Write-Output ''
Write-Output '=== 3) ProductController — create mapping + any date/result fields ==='
$ctl = Get-ChildItem -LiteralPath $rep -Recurse -Filter 'ProductController.java' | Select-Object -First 1
Select-String -LiteralPath $ctl.FullName -Pattern 'Mapping|public |created|date' | ForEach-Object { "L$($_.LineNumber): $($_.Line.Trim())" }