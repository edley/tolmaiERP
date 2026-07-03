$key = "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"

Write-Host "=== Test 1: Simple Hello ===" -ForegroundColor Cyan
$body = @{
    model = "meta/llama-3.3-70b-instruct"
    messages = @(
        @{ role = "user"; content = "Say hello in one word" }
    )
    max_tokens = 20
} | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/chat/completions" -Method Post -Body $body -ContentType "application/json" -Headers @{ Authorization = "Bearer $key" }
    Write-Host "Response:" -ForegroundColor Green
    $resp.choices[0].message.content
}
catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}

Write-Host "`n=== Test 2: Extract payment data ===" -ForegroundColor Cyan
$body2 = @{
    model = "meta/llama-3.3-70b-instruct"
    messages = @(
        @{ role = "system"; content = "Extract payment data as JSON. Return ONLY valid JSON." }
        @{ role = "user"; content = "Payment Confirmation`nAmount: MUR 750.00`nTransfer to: elie and Sons`nBank: MCB Ltd`nReference: FT261526YQ2D`nDate: 01 June 2026" }
    )
    response_format = @{ type = "json_object" }
    max_tokens = 500
} | ConvertTo-Json

try {
    $resp2 = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/chat/completions" -Method Post -Body $body2 -ContentType "application/json" -Headers @{ Authorization = "Bearer $key" }
    Write-Host "Response:" -ForegroundColor Green
    $resp2.choices[0].message.content
}
catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}
