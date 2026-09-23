$researchDir = "c:\Users\Md Sahimuzzaman\Desktop\Nexa-workspace\research\open-source"
if (!(Test-Path -Path $researchDir)) {
    New-Item -ItemType Directory -Path $researchDir | Out-Null
}

Set-Location $researchDir

$repos = @(
    @{name="gaia"; url="https://github.com/theexperiencecompany/gaia.git"},
    @{name="LifeOS"; url="https://github.com/nbramia/LifeOS.git"},
    @{name="AIfred-Intelligence"; url="https://github.com/Peuqui/AIfred-Intelligence.git"},
    @{name="job_agentic"; url="https://github.com/algsoch/job_agentic.git"},
    @{name="jobpilot"; url="https://github.com/Abhishek4411/jobpilot.git"}
)

foreach ($repo in $repos) {
    if (!(Test-Path -Path $repo.name)) {
        Write-Host "Cloning $($repo.name)..."
        git clone $repo.url $repo.name
    } else {
        Write-Host "$($repo.name) already exists."
    }
    
    Set-Location $repo.name
    $sha = git rev-parse HEAD
    Set-Location ..
    
    Write-Host "$($repo.name) SHA: $sha"
}
