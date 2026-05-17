-- modules/watermark.lua
local Watermark = {}

function Watermark.process(code)
    return "-- obfuscated by y8y9 obf https://discord.gg/2DQbVrXJ8A\n" .. code
end

return Watermark
