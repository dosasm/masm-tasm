import { Conf } from "../../dosbox/conf";
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

suite("dosbox conf test", function () {
  const file = path.resolve(
    __dirname,
    "../../..",
    "emu/dosbox/dosbox-0.74.conf"
  );
  const content = fs.readFileSync(file, { encoding: "utf-8" });
  const conf = new Conf(content);

  test("update conf", () => {
    conf.update("sdl", "output", "test");
    assert.ok(conf.get("sdl", "output") === "test", conf.toString());
    const strs = conf
      .toString()
      .split("\n")
      .filter((val) => val.trimLeft().startsWith("output"));
    assert.equal(strs.length, 1, conf.toString());
  });
  test("update conf no key", () => {
    conf.update("sdl", "test", "test");
    assert.equal(conf.get("sdl", "test"), "test", conf.toString());
  });
  test("update conf no section no key", () => {
    conf.update("test", "test", "test");
    assert.equal(conf.get("test", "test"), "test", conf.toString());
  });
});
